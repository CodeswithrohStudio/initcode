import { NextRequest } from "next/server";

// Simulated deployment steps with realistic timing
const DEPLOY_STEPS = [
  { delay: 300, logType: "info", message: "Initializing Initia CosmWasm toolchain..." },
  { delay: 500, logType: "info", message: "Validating contract syntax..." },
  { delay: 800, logType: "info", message: "cargo build --release --target wasm32-unknown-unknown" },
  { delay: 1200, logType: "muted", message: "   Compiling proc-macro2 v1.0.92" },
  { delay: 1400, logType: "muted", message: "   Compiling unicode-ident v1.0.14" },
  { delay: 1600, logType: "muted", message: "   Compiling serde v1.0.218" },
  { delay: 1800, logType: "muted", message: "   Compiling cosmwasm-std v2.2.0" },
  { delay: 2200, logType: "muted", message: "   Compiling cw-storage-plus v2.0.0" },
  { delay: 2600, logType: "muted", message: "   Compiling my-initia-contract v0.1.0" },
  { delay: 3200, logType: "success", message: "   Finished release [optimized] target(s) in 3.2s" },
  { delay: 3500, logType: "info", message: "Optimizing WASM binary..." },
  { delay: 4200, logType: "success", message: "WASM binary size: 184.3 KB (optimized)" },
  { delay: 4500, logType: "info", message: "Broadcasting store-code transaction on initiation-2..." },
  { delay: 4800, status: "storing" },
  { delay: 5200, logType: "info", message: "Waiting for transaction confirmation..." },
  { delay: 6500, logType: "success", message: "Transaction confirmed in block #2847291" },
  { delay: 6800, status: "instantiating" },
  { delay: 7200, logType: "info", message: "Instantiating contract..." },
  { delay: 8000, logType: "info", message: "Waiting for instantiation confirmation..." },
];

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

export async function POST(req: NextRequest) {
  const { contractCode, contractName, walletAddress } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Check if code has obvious syntax issues
        const hasError = contractCode && contractCode.includes("SYNTAX_ERROR");

        send({ type: "log", logType: "info", message: `Starting deployment for ${contractName}...` });
        send({ type: "log", logType: "info", message: `Deploying as ${walletAddress}` });
        send({ type: "log", logType: "muted", message: "Network: Initia Testnet (initiation-2)" });

        let shouldFail = false;

        for (const step of DEPLOY_STEPS) {
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
          controller.close();
          return;
        }

        // Success
        const txHash = generateTxHash();
        const contractAddress = generateContractAddress();
        const codeId = generateCodeId();

        send({
          type: "success",
          contractAddress,
          txHash,
          codeId,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
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
