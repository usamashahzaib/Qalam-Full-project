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
      .select("id, title, content, status, role_profile, engagement_score, created_at, hook")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Posts fetch error:", error);
      return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
    }

    return NextResponse.json({ posts: posts || [] });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Posts route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
