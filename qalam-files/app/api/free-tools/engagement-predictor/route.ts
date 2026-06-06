import { NextRequest, NextResponse } from "next/server";
import { callAi } from "@/lib/server/ai-router";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content || content.length < 10) {
      return NextResponse.json({ error: "Content too short" }, { status: 400 });
    }

    const result = await callAi({
      prompt: `Predict engagement for this LinkedIn post. Be data-driven and specific.
POST:
${content}
PREDICT (JSON):
{
"engagement_score": number,
"estimated_reactions": "range like 50-100",
"estimated_comments": "range like 5-15",
"estimated_shares": "range like 2-8",
"strengths": ["what works"],
"weaknesses": ["what hurts engagement"],
"improvements": ["specific changes to make"],
"best_time_to_post": "day + time"
}`,
      json: true,
      temperature: 0.3,
      timeout: 10000,
    });

    return NextResponse.json(JSON.parse(result));
  } catch (error: any) {
    console.error("Engagement predictor error:", error);
    return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
  }
}
