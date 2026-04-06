import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { prefix, suffix, language } = await req.json() as {
      prefix: string;
      suffix: string;
      language: string;
    };

    if (!prefix) return Response.json({ completion: "" });

    const model = genAI.getGenerativeModel({
      model: "gemma-4-26b-a4b-it",
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.1,
        stopSequences: ["// END", "/* END */"],
      },
    });

    const prompt = `You are an inline code completion engine for a browser IDE. Complete the code exactly where <CURSOR> is.

Rules:
- Output ONLY the text to insert at the cursor — no explanations, no markdown fences, no extra commentary
- Keep it concise: complete the current line or add up to 3–5 lines at most
- Match the indentation and style of the surrounding code
- For ${language} code, follow idiomatic patterns

<code>
${prefix}<CURSOR>${suffix.slice(0, 300)}
</code>

Completion (insert at cursor):`;

    const result = await model.generateContent(prompt);
    let completion = result.response.text().trim();

    // Strip any accidental markdown fences
    completion = completion.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();

    return Response.json({ completion });
  } catch (err) {
    console.error("Complete API error:", err);
    return Response.json({ completion: "" });
  }
}
