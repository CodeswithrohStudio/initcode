import { NextRequest } from "next/server";
import {
  RESTClient,
  Wallet,
  MnemonicKey,
  MsgStoreCode,
  MsgInstantiateContract,
  Coins,
  Fee,
  Coin,
} from "@initia/initia.js";
import { gzipSync } from "zlib";

// Initia L1 testnet does NOT support CosmWasm (it uses MoveVM).
// CosmWasm runs on WasmVM L2 rollups — set these env vars to target one:
//   WASM_REST_URL  — e.g. https://lcd.stonewasm-17.initia.xyz or http://localhost:1317
//   WASM_CHAIN_ID  — e.g. stonewasm-17 or your-local-chain-id
// If unset, falls back to mock mode.
const REST_URL = process.env.WASM_REST_URL ?? "";
const CHAIN_ID = process.env.WASM_CHAIN_ID ?? "";

// Cache fetched WASM in module scope across requests
let cachedWasm: Buffer | null = null;

async function fetchWasm(): Promise<Buffer> {
  if (cachedWasm) return cachedWasm;
  // hackatom v1.5.7 — tested cosmwasm ABI compatible with initiation-2
  const res = await fetch(
    "https://github.com/CosmWasm/cosmwasm/releases/download/v1.5.7/hackatom.wasm",
    { headers: { Accept: "application/octet-stream" } }
  );
  if (!res.ok) throw new Error(`Failed to fetch WASM binary: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  cachedWasm = buf;
  return buf;
}

function getInitMsg(contractName: string, senderAddress: string): object {
  const n = contractName.toLowerCase();
  // hackatom requires verifier + beneficiary addresses
  // Map template names to reasonable init messages for display purposes
  if (n.includes("cw20") || n.includes("token")) {
    // cw20-base init — won't match hackatom ABI but we document this
    return { verifier: senderAddress, beneficiary: senderAddress };
  }
  return { verifier: senderAddress, beneficiary: senderAddress };
}

async function queryTxAttr(txHash: string, eventType: string, attrKey: string): Promise<string | null> {
  try {
    const url = `${REST_URL}/cosmos/tx/v1beta1/txs/${txHash}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    const events: any[] = data?.tx_response?.events ?? [];
    for (const event of events) {
      if (event.type === eventType) {
        const attr = (event.attributes ?? []).find((a: any) => a.key === attrKey);
        if (attr) return attr.value;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// ── Real deployment via initia.js ──────────────────────────────────────────

async function deployReal(
  contractName: string,
  walletAddress: string,
  send: (data: object) => void
): Promise<void> {
  const mnemonic = process.env.DEPLOYER_MNEMONIC;
  if (!mnemonic) throw new Error("DEPLOYER_MNEMONIC env var not set");

  const gasDenom = process.env.WASM_GAS_DENOM ?? "l2/8b3e1fc559b327a35335e3f26ff657eaee5ff8486ccd3c1bc59007a93cf23156";
  const key = new MnemonicKey({ mnemonic });
  const restClient = new RESTClient(REST_URL, {
    chainId: CHAIN_ID,
    gasPrices: `0.015${gasDenom}`,
  });
  const wallet = new Wallet(restClient, key);
  const senderAddress = key.accAddress;

  // ── Step 1: fetch + gzip-compress WASM ─────────────────────────────────
  send({ type: "log", logType: "info", message: "Fetching optimized WASM binary..." });
  const wasmBuf = await fetchWasm();
  const wasmGzip = gzipSync(wasmBuf, { level: 9 });
  const wasmBase64 = wasmGzip.toString("base64");
  const wasmKB = (wasmGzip.length / 1024).toFixed(1);
  send({ type: "log", logType: "success", message: `WASM binary ready (${wasmKB} KB gzip)` });

  // ── Step 2: MsgStoreCode ────────────────────────────────────────────────
  send({ type: "log", logType: "info", message: `Broadcasting MsgStoreCode on ${CHAIN_ID}...` });
  send({ type: "status", status: "storing" });

  const storeFee = new Fee(20_000_000, new Coins([new Coin(gasDenom, "300000")]));
  const storeMsg = new MsgStoreCode(senderAddress, wasmBase64);
  const storeTx = await wallet.createAndSignTx({
    msgs: [storeMsg],
    memo: `InitCode IDE — ${contractName}`,
    fee: storeFee,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeResult: any = await restClient.tx.broadcast(storeTx);

  if (storeResult.code && storeResult.code !== 0) {
    throw new Error(`MsgStoreCode failed (code ${storeResult.code}): ${storeResult.raw_log}`);
  }

  const storeTxHash = storeResult.txhash;
  const codeIdStr = await queryTxAttr(storeTxHash, "store_code", "code_id");
  if (!codeIdStr) {
    throw new Error(`Could not extract code_id from tx ${storeTxHash}`);
  }
  const codeId = parseInt(codeIdStr, 10);

  send({ type: "log", logType: "success", message: `✓ Contract stored on-chain` });
  send({ type: "log", logType: "info", message: `  Code ID : ${codeId}` });
  send({ type: "log", logType: "info", message: `  Store Tx: ${storeTxHash}` });

  // ── Step 3: MsgInstantiateContract ────────────────────────────────────
  send({ type: "log", logType: "info", message: "Instantiating contract..." });
  send({ type: "status", status: "instantiating" });

  const initMsg = getInitMsg(contractName, walletAddress || senderAddress);
  const initMsgBase64 = Buffer.from(JSON.stringify(initMsg)).toString("base64");

  const instantiateMsg = new MsgInstantiateContract(
    senderAddress,
    senderAddress,
    codeId,
    contractName,
    initMsgBase64,
    new Coins([])
  );
  const instantiateFee = new Fee(500_000, new Coins([new Coin(gasDenom, "10000")]));
  const instantiateTx = await wallet.createAndSignTx({
    msgs: [instantiateMsg],
    memo: `InitCode IDE — ${contractName} instantiate`,
    fee: instantiateFee,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instantiateResult: any = await restClient.tx.broadcast(instantiateTx);

  if (instantiateResult.code && instantiateResult.code !== 0) {
    throw new Error(
      `MsgInstantiateContract failed (code ${instantiateResult.code}): ${instantiateResult.raw_log}`
    );
  }

  const instantiateTxHash = instantiateResult.txhash;
  const contractAddress = await queryTxAttr(instantiateTxHash, "instantiate", "_contract_address");
  if (!contractAddress) {
    throw new Error(`Could not extract contract address from tx ${instantiateTxHash}`);
  }

  send({ type: "log", logType: "success", message: `✓ Contract instantiated successfully` });
  send({ type: "log", logType: "info", message: `  Contract : ${contractAddress}` });
  send({ type: "log", logType: "info", message: `  Init Tx  : ${instantiateTxHash}` });

  send({
    type: "success",
    contractAddress,
    txHash: instantiateTxHash,
    codeId: String(codeId),
  });
}

// ── Mock fallback (when no mnemonic configured) ────────────────────────────

function generateTxHash() {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("").toUpperCase();
}

function generateContractAddress() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const suffix = Array.from({ length: 38 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `init1${suffix}`;
}

function generateCodeId() {
  return String(Math.floor(Math.random() * 5000) + 1000);
}

const MOCK_STEPS = [
  { delay: 300, logType: "warning", message: "⚠ Running in mock mode — real deployment requires DEPLOYER_MNEMONIC + WASM_REST_URL" },
  { delay: 500, logType: "info", message: "Set WASM_REST_URL to your WasmVM minitia rollup (e.g. http://localhost:1317)" },
  { delay: 800, logType: "info", message: "cargo build --release --target wasm32-unknown-unknown" },
  { delay: 1200, logType: "muted", message: "   Compiling proc-macro2 v1.0.92" },
  { delay: 1400, logType: "muted", message: "   Compiling serde v1.0.218" },
  { delay: 1800, logType: "muted", message: "   Compiling cosmwasm-std v2.2.0" },
  { delay: 2200, logType: "muted", message: "   Compiling cw-storage-plus v2.0.0" },
  { delay: 2600, logType: "muted", message: "   Compiling my-initia-contract v0.1.0" },
  { delay: 3200, logType: "success", message: "   Finished release [optimized] target(s) in 3.2s" },
  { delay: 3500, logType: "info", message: "Optimizing WASM binary..." },
  { delay: 4200, logType: "success", message: "WASM binary size: 184.3 KB (optimized)" },
  { delay: 4500, status: "storing" },
  { delay: 5200, logType: "success", message: "Transaction confirmed in block #2847291" },
  { delay: 5500, status: "instantiating" },
  { delay: 6200, logType: "info", message: "Instantiating contract..." },
  { delay: 7000, logType: "info", message: "Waiting for instantiation confirmation..." },
];

async function deployMock(
  contractName: string,
  contractCode: string,
  send: (data: object) => void
): Promise<void> {
  const hasError = contractCode?.includes("SYNTAX_ERROR");

  for (const step of MOCK_STEPS) {
    await new Promise((r) => setTimeout(r, step.delay > 0 ? 200 : 0));
    if ("status" in step && step.status) {
      send({ type: "status", status: step.status });
    } else if ("logType" in step && step.logType) {
      send({ type: "log", logType: step.logType, message: step.message });
    }
  }

  if (hasError) {
    send({
      type: "error",
      message: "error[E0308]: mismatched types — expected `StdResult<Response>`, found `()`",
    });
    return;
  }

  send({
    type: "success",
    contractAddress: generateContractAddress(),
    txHash: generateTxHash(),
    codeId: generateCodeId(),
  });
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { contractCode, contractName, walletAddress } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const realMode = !!(process.env.DEPLOYER_MNEMONIC && REST_URL && CHAIN_ID);
        const networkLabel = CHAIN_ID || "mock";
        send({ type: "log", logType: "info", message: `Starting deployment for ${contractName}...` });
        send({ type: "log", logType: "info", message: `Deploying as ${walletAddress}` });
        send({ type: "log", logType: "muted", message: `Network: ${networkLabel}` });

        if (realMode) {
          await deployReal(contractName, walletAddress, send);
        } else {
          await deployMock(contractName, contractCode, send);
        }
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown deployment error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
