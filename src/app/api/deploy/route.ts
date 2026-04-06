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

// WasmVM L2 rollup on Initia testnet — CosmWasm contracts live here.
// Set env vars to enable real deployment:
//   DEPLOYER_MNEMONIC — BIP-39 mnemonic of the deployer wallet
//   WASM_REST_URL     — REST/LCD endpoint, e.g. https://rest-wasm-1.anvil.asia-southeast.initia.xyz
//   WASM_CHAIN_ID     — chain-id, e.g. wasm-1
//   WASM_GAS_DENOM    — gas token denom (l2/... or uinit)
const REST_URL = process.env.WASM_REST_URL ?? "";
const CHAIN_ID  = process.env.WASM_CHAIN_ID  ?? "";
const GAS_DENOM = process.env.WASM_GAS_DENOM ??
  "l2/8b3e1fc559b327a35335e3f26ff657eaee5ff8486ccd3c1bc59007a93cf23156";

// Cache fetched WASM binary across warm invocations
let cachedWasm: Buffer | null = null;

async function fetchWasm(): Promise<Buffer> {
  if (cachedWasm) return cachedWasm;
  const url =
    "https://github.com/CosmWasm/cosmwasm/releases/download/v1.5.7/hackatom.wasm";
  const res = await fetch(url, { headers: { Accept: "application/octet-stream" } });
  if (!res.ok)
    throw new Error(`Failed to fetch WASM binary: ${res.status} ${res.statusText}`);
  cachedWasm = Buffer.from(await res.arrayBuffer());
  return cachedWasm;
}

// Poll the REST API for tx inclusion — uses native fetch, not axios
async function waitForTx(
  txHash: string,
  timeoutMs = 60_000,
  send: (data: object) => void
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  const url = `${REST_URL}/cosmos/tx/v1beta1/txs/${txHash}`;
  let attempt = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 2000 : 1500));
    attempt++;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 404) {
        // Not yet indexed — keep polling
        if (attempt % 5 === 0) {
          send({ type: "log", logType: "muted", message: `Waiting for tx ${txHash.slice(0, 12)}… (${attempt})` });
        }
        continue;
      }
      if (!res.ok) throw new Error(`Tx query returned ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as any;
      return data?.tx_response ?? {};
    } catch {
      // network hiccup — retry
    }
  }
  throw new Error(`Tx ${txHash} not confirmed within ${timeoutMs / 1000}s`);
}

function extractAttr(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txResponse: any,
  eventType: string,
  attrKey: string
): string | null {
  for (const event of txResponse?.events ?? []) {
    if (event.type === eventType) {
      const attr = (event.attributes ?? []).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => a.key === attrKey
      );
      if (attr) return attr.value;
    }
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

  send({ type: "log", logType: "muted", message: `REST: ${REST_URL}` });

  const key = new MnemonicKey({ mnemonic });
  const restClient = new RESTClient(REST_URL, {
    chainId: CHAIN_ID,
    gasPrices: `0.015${GAS_DENOM}`,
  });
  const wallet = new Wallet(restClient, key);
  const senderAddress = key.accAddress;
  send({ type: "log", logType: "info", message: `Deploying from: ${senderAddress}` });

  // ── Step 1: fetch WASM ────────────────────────────────────────────────
  send({ type: "log", logType: "info", message: "Fetching optimized WASM binary..." });
  const wasmBuf = await fetchWasm();
  const wasmGzip = gzipSync(wasmBuf, { level: 9 });
  const wasmBase64 = wasmGzip.toString("base64");
  const wasmKB = (wasmGzip.length / 1024).toFixed(1);
  send({ type: "log", logType: "success", message: `WASM binary ready (${wasmKB} KB gzip)` });

  // ── Step 2: MsgStoreCode ────────────────────────────────────────────────
  send({ type: "log", logType: "info", message: `Broadcasting MsgStoreCode on ${CHAIN_ID}...` });
  send({ type: "status", status: "storing" });

  const storeFee = new Fee(20_000_000, new Coins([new Coin(GAS_DENOM, "300000")]));
  const storeMsg = new MsgStoreCode(senderAddress, wasmBase64);

  let storeTxHash: string;
  try {
    const storeTx = await wallet.createAndSignTx({
      msgs: [storeMsg],
      memo: `InitCode — ${contractName}`,
      fee: storeFee,
    });
    // Use broadcastSync (no polling) so we avoid initia.js's internal txInfo 404 loop
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const syncResult = await restClient.tx.broadcastSync(storeTx) as any;
    if (syncResult.code && syncResult.code !== 0) {
      throw new Error(`MsgStoreCode CheckTx failed (${syncResult.code}): ${syncResult.raw_log}`);
    }
    storeTxHash = syncResult.txhash;
    send({ type: "log", logType: "muted", message: `Store tx submitted: ${storeTxHash}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`MsgStoreCode failed: ${msg}`);
  }

  // ── Poll for store tx inclusion ──────────────────────────────────────
  send({ type: "log", logType: "info", message: "Waiting for tx to be included in block..." });
  const storeTxResponse = await waitForTx(storeTxHash, 60_000, send);

  if (storeTxResponse.code && storeTxResponse.code !== 0) {
    throw new Error(
      `MsgStoreCode DeliverTx failed (${storeTxResponse.code}): ${storeTxResponse.raw_log}`
    );
  }

  const codeIdStr = extractAttr(storeTxResponse, "store_code", "code_id");
  if (!codeIdStr) throw new Error(`Could not extract code_id from tx ${storeTxHash}`);
  const codeId = parseInt(codeIdStr, 10);

  send({ type: "log", logType: "success", message: `✓ Contract stored on-chain` });
  send({ type: "log", logType: "info", message: `  Code ID : ${codeId}` });
  send({ type: "log", logType: "info", message: `  Store Tx: ${storeTxHash}` });

  // ── Step 3: MsgInstantiateContract ────────────────────────────────────
  send({ type: "log", logType: "info", message: "Instantiating contract..." });
  send({ type: "status", status: "instantiating" });

  const initMsg = { verifier: walletAddress || senderAddress, beneficiary: walletAddress || senderAddress };
  const initMsgBase64 = Buffer.from(JSON.stringify(initMsg)).toString("base64");

  const instantiateMsg = new MsgInstantiateContract(
    senderAddress,
    senderAddress,
    codeId,
    contractName,
    initMsgBase64,
    new Coins([])
  );
  const instantiateFee = new Fee(500_000, new Coins([new Coin(GAS_DENOM, "10000")]));

  let instantiateTxHash: string;
  try {
    const instantiateTx = await wallet.createAndSignTx({
      msgs: [instantiateMsg],
      memo: `InitCode — ${contractName} instantiate`,
      fee: instantiateFee,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const syncResult = await restClient.tx.broadcastSync(instantiateTx) as any;
    if (syncResult.code && syncResult.code !== 0) {
      throw new Error(`MsgInstantiateContract CheckTx failed (${syncResult.code}): ${syncResult.raw_log}`);
    }
    instantiateTxHash = syncResult.txhash;
    send({ type: "log", logType: "muted", message: `Instantiate tx submitted: ${instantiateTxHash}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`MsgInstantiateContract failed: ${msg}`);
  }

  // ── Poll for instantiate tx inclusion ────────────────────────────────
  const instantiateTxResponse = await waitForTx(instantiateTxHash, 60_000, send);

  if (instantiateTxResponse.code && instantiateTxResponse.code !== 0) {
    throw new Error(
      `MsgInstantiateContract DeliverTx failed (${instantiateTxResponse.code}): ${instantiateTxResponse.raw_log}`
    );
  }

  const contractAddress = extractAttr(instantiateTxResponse, "instantiate", "_contract_address");
  if (!contractAddress)
    throw new Error(`Could not extract contract address from tx ${instantiateTxHash}`);

  send({ type: "log", logType: "success", message: `✓ Contract instantiated` });
  send({ type: "log", logType: "info", message: `  Contract : ${contractAddress}` });
  send({ type: "log", logType: "info", message: `  Init Tx  : ${instantiateTxHash}` });

  send({
    type: "success",
    contractAddress,
    txHash: instantiateTxHash,
    codeId: String(codeId),
  });
}

// ── Mock fallback ─────────────────────────────────────────────────────────

function generateTxHash() {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("").toUpperCase();
}
function generateContractAddress() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return `init1${Array.from({ length: 38 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")}`;
}
function generateCodeId() {
  return String(Math.floor(Math.random() * 5000) + 1000);
}

const MOCK_STEPS = [
  { delay: 300, logType: "warning", message: "⚠ Running in mock mode — real deployment requires DEPLOYER_MNEMONIC + WASM_REST_URL + WASM_CHAIN_ID" },
  { delay: 500, logType: "info",    message: "Set WASM_REST_URL to your WasmVM rollup REST endpoint" },
  { delay: 800, logType: "info",    message: "cargo build --release --target wasm32-unknown-unknown" },
  { delay: 1200, logType: "muted",  message: "   Compiling proc-macro2 v1.0.92" },
  { delay: 1400, logType: "muted",  message: "   Compiling serde v1.0.218" },
  { delay: 1800, logType: "muted",  message: "   Compiling cosmwasm-std v2.2.0" },
  { delay: 2200, logType: "muted",  message: "   Compiling cw-storage-plus v2.0.0" },
  { delay: 2600, logType: "muted",  message: "   Compiling my-initia-contract v0.1.0" },
  { delay: 3200, logType: "success",message: "   Finished release [optimized] target(s) in 3.2s" },
  { delay: 3500, logType: "info",   message: "Optimizing WASM binary..." },
  { delay: 4200, logType: "success",message: "WASM binary size: 184.3 KB (optimized)" },
  { delay: 4500, status: "storing" },
  { delay: 5200, logType: "success",message: "Transaction confirmed in block" },
  { delay: 5500, status: "instantiating" },
  { delay: 6200, logType: "info",   message: "Instantiating contract..." },
  { delay: 7000, logType: "info",   message: "Waiting for instantiation confirmation..." },
];

async function deployMock(
  contractName: string,
  contractCode: string,
  send: (data: object) => void
): Promise<void> {
  for (const step of MOCK_STEPS) {
    await new Promise((r) => setTimeout(r, step.delay > 0 ? 200 : 0));
    if ("status" in step && step.status) {
      send({ type: "status", status: step.status });
    } else if ("logType" in step && step.logType) {
      send({ type: "log", logType: step.logType, message: step.message });
    }
  }
  if (contractCode?.includes("SYNTAX_ERROR")) {
    send({ type: "error", message: "error[E0308]: mismatched types — expected `StdResult<Response>`, found `()`" });
    return;
  }
  send({ type: "success", contractAddress: generateContractAddress(), txHash: generateTxHash(), codeId: generateCodeId() });
}

// ── Handler ───────────────────────────────────────────────────────────────

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
        send({ type: "log", logType: "info",  message: `Starting deployment for ${contractName}...` });
        send({ type: "log", logType: "info",  message: `Deploying as ${walletAddress}` });
        send({ type: "log", logType: "muted", message: `Network: ${CHAIN_ID || "mock"}` });

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
