import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/clerk-client";
import { checkPlanLimit } from "@/lib/server/plan-limits";
import { callAi } from "@/lib/server/ai-router";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { topic, role = "founder", slideCount = 5 } = await req.json();

    if (!topic || topic.trim().length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 });
    }

    const { allowed, current, limit } = await checkPlanLimit(userId, "carousels");
    if (!allowed) {
      return NextResponse.json(
        { error: "Carousel limit reached", current, limit, upgrade_url: "/pricing" },
        { status: 403 }
      );
    }

    const prompt = `Create a ${slideCount}-slide LinkedIn carousel about "${topic}" for a ${role.replace("_", " ")} audience.

Each slide should have:
- A clear title (max 5 words)
- Concise content (max 30 words)
- A visual description for the designer

FORMAT (JSON array):
[
  {"slide_number": 1, "title": "...", "content": "...", "visual": "..."},
  ...
]

Rules:
- Slide 1 is the hook
- Slide ${slideCount} is the CTA
- Middle slides build the argument
- No generic business jargon
- Specific, actionable content`;

    const result = await callAi("Return strict JSON only. No markdown, no explanation.", prompt, { json: true, temperature: 0.7, timeout: 20000 });
    const slides = JSON.parse(result);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: project, error: projError } = await supabase
      .from("carousel_projects")
      .insert({ user_id: userId, title: topic, role_profile: role })
      .select()
      .single();

    if (projError || !project) {
      console.error("Project save error:", projError);
      return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
    }

    const { error: slidesError } = await supabase.from("carousel_slides").insert(
      slides.map((s: any) => ({
        project_id: project.id,
        slide_number: s.slide_number,
        title: s.title,
        content: s.content,
        image_prompt: s.visual,
      }))
    );

    if (slidesError) {
      console.error("Slides save error:", slidesError);
    }

    return NextResponse.json({ projectId: project.id, slides });
  } catch (error: any) {
    console.error("Carousel generate error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to generate carousel" }, { status: 500 });
  }
}
