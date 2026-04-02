import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are InitCode AI, an expert assistant for CosmWasm smart contract development on the Initia blockchain ecosystem. You specialize in:

1. **CosmWasm & Rust**: Writing, auditing, and explaining CosmWasm smart contracts
2. **Initia Ecosystem**: Chain IDs, module addresses, testnet endpoints, InterwovenKit wallet integration
3. **Security Auditing**: Identifying reentrancy, access control, overflow, and other vulnerabilities
4. **Deployment**: Helping users deploy contracts to Initia testnet

Key Initia facts:
- Testnet chain ID: \`initiation-2\`
- Testnet RPC: \`https://rpc.initiation-2.initia.xyz\`
- Testnet LCD: \`https://lcd.initiation-2.initia.xyz\`
- Explorer: \`https://scan.testnet.initia.xyz\`
- Faucet: \`https://faucet.testnet.initia.xyz\`
- Native token: INIT
- InterwovenKit package: \`@initia/interwovenkit-react\`

Always provide practical, working code examples. Format code in markdown code blocks. Be concise but thorough. When auditing security, provide a severity-scored report.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    // Return as SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({
                choices: [{ delta: { content: event.delta.text } }],
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
