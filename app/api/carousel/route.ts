import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/clerk-client";
import { checkPlanLimit, getPlanStatus } from "@/lib/server/plan-limits";
import { callAi } from "@/lib/server/ai-router";
import { createClient } from "@supabase/supabase-js";

type Slide = {
  slide_number: number;
  title: string;
  content: string;
  visual: string;
};

export async function GET() {
  try {
    const userId = await requireAuth();
    const status = await getPlanStatus(userId);
    return NextResponse.json({
      allowed: true,
      current: status.used.carousels,
      limit: status.limits.carousels,
      remaining: Math.max(0, status.limits.carousels - status.used.carousels),
      plan: status.plan,
    });
  } catch (error) {
    const message = (error as Error).message || "Failed to load carousel usage";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { topic, role = "founder", slideCount = 5 } = await req.json();

    if (!topic || topic.trim().length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 });
    }

    const safeSlideCount = Math.min(10, Math.max(5, Math.trunc(Number(slideCount) || 5)));

    const { allowed, current, limit } = await checkPlanLimit(userId, "carousels");
    if (!allowed) {
      return NextResponse.json(
        { error: "Carousel limit reached", current, limit, upgrade_url: "/pricing" },
        { status: 403 }
      );
    }

    const prompt = `Create a ${safeSlideCount}-slide LinkedIn carousel about "${topic}" for a ${role.replace("_", " ")} audience.

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
- Slide ${safeSlideCount} is the CTA
- Middle slides build the argument
- No generic business jargon
- Specific, actionable content`;

    const result = await callAi("Return strict JSON only. No markdown, no explanation.", prompt, { json: true, temperature: 0.7, timeout: 20000 });

    // VALIDATION - Agar AI garbage de toh crash nahi hoga
    let slides: Slide[];
    try {
      const parsed = JSON.parse(result);
      const rawSlides = Array.isArray(parsed) ? parsed : parsed.slides || [];
      if (!Array.isArray(rawSlides) || rawSlides.length === 0) throw new Error("No slides");
      slides = rawSlides.slice(0, safeSlideCount).map((s: any, i: number) => ({
        slide_number: Number(s.slide_number || i + 1),
        title: String(s.title || `Slide ${i + 1}`).trim().slice(0, 80),
        content: String(s.content || "").trim().slice(0, 260),
        visual: String(s.visual || "").trim().slice(0, 320),
      }));
    } catch (parseError) {
      console.error("AI parse error:", parseError, "Raw:", result);
      return NextResponse.json({ error: "AI returned invalid format. Please try again." }, { status: 502 });
    }

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
      slides.map((s) => ({
        project_id: project.id,
        slide_number: s.slide_number,
        title: s.title,
        content: s.content,
        image_prompt: s.visual,
      }))
    );

    if (slidesError) {
      console.error("Slides save error:", slidesError);
      return NextResponse.json({ error: "Project saved but slides failed to save" }, { status: 500 });
    }

    return NextResponse.json({
      projectId: project.id,
      slides,
      usage: { allowed, current, limit, remaining: Math.max(0, limit - current), plan: "carousel" },
    });
  } catch (error: any) {
    console.error("Carousel generate error:", error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to generate carousel" }, { status: 500 });
  }
}