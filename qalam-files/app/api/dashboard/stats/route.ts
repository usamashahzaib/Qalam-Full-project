import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/clerk-client";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const userId = await requireAuth();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: posts, error } = await supabase
      .from("posts")
      .select("status, engagement_score")
      .eq("user_id", userId);

    if (error) {
      console.error("Stats error:", error);
      return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
    }

    const total = posts?.length || 0;
    const drafts = posts?.filter((p) => p.status === "draft").length || 0;
    const published = posts?.filter((p) => p.status === "published").length || 0;
    const scores = posts?.filter((p) => p.engagement_score).map((p) => p.engagement_score) || [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return NextResponse.json({ total, drafts, published, avgScore });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
