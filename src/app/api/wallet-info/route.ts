import { NextResponse } from "next/server";
import { MnemonicKey, RESTClient } from "@initia/initia.js";

const REST_URL = process.env.WASM_REST_URL ?? "https://rest-wasm-1.anvil.asia-southeast.initia.xyz";
const CHAIN_ID = process.env.WASM_CHAIN_ID ?? "wasm-1";
const GAS_DENOM = process.env.WASM_GAS_DENOM ?? "l2/8b3e1fc559b327a35335e3f26ff657eaee5ff8486ccd3c1bc59007a93cf23156";

export async function GET() {
  const mnemonic = process.env.DEPLOYER_MNEMONIC;
  if (!mnemonic) {
    return NextResponse.json({ error: "DEPLOYER_MNEMONIC not set" }, { status: 500 });
  }

  const key = new MnemonicKey({ mnemonic });
  const address = key.accAddress;

  // Fetch live balance directly from the REST API (bypass initia.js Coins parsing)
  let balanceINIT = 0;
  try {
    const url = `${REST_URL}/cosmos/bank/v1beta1/balances/${address}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json() as { balances: Array<{ denom: string; amount: string }> };
      for (const coin of data.balances ?? []) {
        if (coin.denom === GAS_DENOM || coin.denom === "uinit") {
          balanceINIT = Number(coin.amount) / 1_000_000;
          break;
        }
      }
    }
  } catch (e) {
    console.error("wallet-info balance fetch failed:", e);
  }

  return NextResponse.json({ address, balanceINIT, chain: CHAIN_ID });
}
