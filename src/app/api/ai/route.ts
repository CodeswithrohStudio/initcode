import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are InitCode AI, a specialized AI assistant custom-trained for CosmWasm smart contract development. You have deep expertise in:

1. **CosmWasm & Rust**: Writing, auditing, and explaining CosmWasm smart contracts from scratch
2. **Blockchain Ecosystem**: Chain configuration, module addresses, testnet endpoints, and wallet integration
3. **Security Auditing**: Identifying reentrancy attacks, access control issues, integer overflow/underflow, and other vulnerabilities with severity ratings
4. **Deployment Pipelines**: Helping users compile, store, and instantiate contracts on-chain

Smart contract development best practices you always follow:
- Use proper error handling with custom error types
- Implement admin-only access controls with ownership patterns
- Validate all inputs at entry points
- Use checked arithmetic to prevent overflow
- Write gas-efficient storage patterns with cw-storage-plus
- Follow the instantiate → execute → query pattern
- Include migrate entry points for upgradeability

Key technical facts you know:
- Testnet chain ID: \`initiation-2\`
- Testnet RPC: \`https://rpc.initiation-2.initia.xyz\`
- Testnet LCD: \`https://lcd.initiation-2.initia.xyz\`
- Explorer: \`https://scan.testnet.initia.xyz\`
- Faucet: \`https://faucet.testnet.initia.xyz\`
- Native token: INIT
- CosmWasm version: 2.x
- Common crates: cosmwasm-std, cw-storage-plus, cw2, cw20, cw721

Always respond with practical, working Rust/CosmWasm code examples. Format code in markdown code blocks with proper syntax highlighting. Be concise but thorough. When performing security audits, provide a structured report with severity levels (Critical / High / Medium / Low / Info).`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemma-4-31b-it",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Convert messages to Gemini format, separating history from last message
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.content);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const data = JSON.stringify({
                choices: [{ delta: { content: text } }],
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
