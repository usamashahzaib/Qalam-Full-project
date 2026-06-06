import { NextRequest, NextResponse } from "next/server";
import { callAi } from "@/lib/server/ai-router";

export async function POST(req: NextRequest) {
  try {
    const { headline } = await req.json();

    if (!headline || headline.length < 5) {
      return NextResponse.json({ error: "Headline too short" }, { status: 400 });
    }

    const result = await callAi({
      prompt: `Analyze this LinkedIn headline/hook.
HEADLINE:
${headline}
SCORE 0-100 on:
Curiosity gap (does it make reader want more?)
Specificity (concrete vs vague)
Emotional pull
Length (ideal for mobile)
Uniqueness (has this been seen 1000 times?)
OUTPUT JSON:
{
"total_score": number,
"breakdown": { "curiosity": number, "specificity": number, "emotion": number, "length": number, "uniqueness": number },
"verdict": "Excellent / Good / Average / Weak / Spam",
"why": "specific critique",
"alternatives": ["better version 1", "better version 2", "better version 3"]
}`,
      json: true,
      temperature: 0.3,
      timeout: 10000,
    });

    return NextResponse.json(JSON.parse(result));
  } catch (error: any) {
    console.error("Headline analyzer error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
