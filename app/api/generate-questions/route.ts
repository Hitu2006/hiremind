import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: NextRequest) {
  try {
    const { resume, jobRole } = await req.json();

    if (!resume || resume.length < 50) {
      return NextResponse.json(
        { error: "Resume too short or missing" },
        { status: 400 }
      );
    }

    console.log(`Generating questions for role: ${jobRole}`);
    console.log(`Resume length: ${resume.length} chars`);

    const systemPrompt = `You are a senior technical interviewer for a ${jobRole} position.

The candidate has submitted this resume:
---
${resume}
---

Your job: Generate exactly 5 personalized interview questions based on THIS specific resume.

Guidelines:
- Reference their actual projects, companies, technologies, and skills
- Match the difficulty to their claimed experience level (junior → fundamentals, senior → architecture)
- Progress from easier to harder
- Ask about SPECIFIC things on their resume (e.g., "You mentioned migrating 200k LOC at TechCorp — what were the biggest challenges?")
- If their resume is thin or has limited projects, ask foundational questions appropriate to their level — but still reference what IS there
- 1 question should probe depth, 1 should test problem-solving, 1 should cover collaboration/teamwork, 1 should test their strongest tech stack, 1 should test growth/learning

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": 1,
      "text": "<the question text>",
      "topic": "<2-4 word topic>",
      "difficulty": "Easy" | "Medium" | "Hard"
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate 5 personalized interview questions for this candidate applying to be a ${jobRole}.`,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error("Invalid questions format from AI");
    }

    console.log(`✅ Generated ${result.questions.length} questions`);

    return NextResponse.json({ questions: result.questions });
  } catch (error) {
    console.error("Question generation error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate questions", details: errorMsg },
      { status: 500 }
    );
  }
}