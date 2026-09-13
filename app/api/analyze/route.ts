import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Diagnostic GET endpoint
export async function GET() {
  return NextResponse.json({
    status: "analyze endpoint is reachable",
    hasGroqKey: !!process.env.GROQ_API_KEY,
    keyPrefix: process.env.GROQ_API_KEY?.slice(0, 8) || "MISSING",
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob;
    const question = formData.get("question") as string;
    const topic = (formData.get("topic") as string) || "General";

    // ✅ NEW: Read resume and job role from the form
    const resume = (formData.get("resume") as string) || "";
    const jobRole = (formData.get("jobRole") as string) || "Software Engineer";

    if (!audioBlob || !question) {
      return NextResponse.json({ error: "Missing audio or question" }, { status: 400 });
    }

    console.log(`Analyzing for role: ${jobRole}`);
    console.log(`Resume length: ${resume.length} chars`);
    console.log(`Question: "${question.slice(0, 60)}..."`);

    // Transcribe with Whisper
    const audioFile = new File([audioBlob], "answer.webm", { type: "audio/webm" });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      language: "en",
    });

    const transcript = transcription.text?.trim() || "";
    console.log("Transcript:", transcript);

    if (transcript.length < 10) {
      return NextResponse.json({
        transcript: transcript || "(No speech detected)",
        score: 0,
        strengths: "No verbal response was detected.",
        weaknesses: "You did not provide an answer.",
        suggestedAnswer: "Structure your thoughts and speak clearly for 30-60 seconds.",
      });
    }

    // ✅ UPDATED: System prompt now includes resume + job role
    const systemPrompt = `You are a senior technical interviewer evaluating a candidate for the role of ${jobRole}.

You have access to the candidate's resume:
---
${resume || "(No resume provided)"}
---

Use the resume to:
- Judge whether the candidate's answer aligns with their claimed experience
- Reference their specific projects, companies, or skills when relevant
- Detect if their answer sounds rehearsed vs. grounded in real experience
- Give role-specific feedback (${jobRole} expects certain skills)

Return ONLY valid JSON:
{
  "score": <1-10, be strict>,
  "strengths": "<1-2 sentences, reference resume when possible>",
  "weaknesses": "<1-2 sentences>",
  "suggestedAnswer": "<2-3 sentence model answer that a ${jobRole} should give>"
}

Scoring (BE STRICT):
- 9-10: Comprehensive, specific, measurable impact, matches resume depth
- 7-8: Solid with examples, consistent with resume claims
- 5-6: Generic, lacks specifics, or contradicts resume
- 3-4: Weak or vague, clearly not aligned with stated experience
- 1-2: Off-topic or incoherent
- 0: No answer`;

    // Analyze with LLM
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Topic: ${topic}\nQuestion: ${question}\nCandidate's spoken answer: "${transcript}"\n\nEvaluate critically using the resume as context.`,
        },
      ],
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json({
      transcript,
      score: Math.max(0, Math.min(10, Math.round(analysis.score || 0))),
      strengths: analysis.strengths || "No clear strengths.",
      weaknesses: analysis.weaknesses || "Needs more depth.",
      suggestedAnswer: analysis.suggestedAnswer || "Add specific examples.",
    });
  } catch (error) {
    console.error("Analysis error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Analysis failed",
        details: errorMsg,
        transcript: "",
        score: 0,
        strengths: "Analysis failed",
        weaknesses: "Please try again",
        suggestedAnswer: "N/A",
      },
      { status: 500 }
    );
  }
}