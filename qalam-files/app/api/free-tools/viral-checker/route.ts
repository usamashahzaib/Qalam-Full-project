import { NextRequest, NextResponse } from "next/server";
import { callAi } from "@/lib/server/ai-router";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content || content.length < 10) {
      return NextResponse.json({ error: "Content too short" }, { status: 400 });
    }

    const result = await callAi({
      prompt: `Analyze this LinkedIn post for viral potential. Be specific and critical.
POST:
${content}
SCORE 0-100 on:
Hook strength (does it stop scrolling?)
Emotional trigger (does it provoke reaction?)
Shareability (would someone send this to a colleague?)
Comment bait (does it invite discussion?)
Timing relevance (is it about current pain points?)
OUTPUT JSON:
{
"viral_score": number,
"breakdown": { "hook": number, "emotion": number, "share": number, "comment": number, "timing": number },
"verdict": "Will go viral / Good reach / Average / Poor",
"specific_feedback": "exactly what to fix",
"improved_version": "rewritten hook if weak"
}`,
      json: true,
      temperature: 0.3,
      timeout: 10000,
    });

    return NextResponse.json(JSON.parse(result));
  } catch (error: any) {
    console.error("Viral checker error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
