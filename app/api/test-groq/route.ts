import { NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function GET() {
  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Say 'Groq works!'" }],
    });
    return NextResponse.json({
      success: true,
      hasKey: !!process.env.GROQ_API_KEY,
      response: completion.choices[0].message.content,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      hasKey: !!process.env.GROQ_API_KEY,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}