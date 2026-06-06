import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/clerk-client";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: project } = await supabase
      .from("carousel_projects")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: slides } = await supabase
      .from("carousel_slides")
      .select("*")
      .eq("project_id", id)
      .order("slide_number", { ascending: true });

    const html = `
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .slide { page-break-after: always; border: 2px solid #000; padding: 40px; margin-bottom: 20px; min-height: 400px; }
        .slide:last-child { page-break-after: auto; }
        .number { font-size: 48px; font-weight: bold; color: #ccc; margin-bottom: 20px; }
        .title { font-size: 28px; font-weight: bold; margin-bottom: 20px; }
        .content { font-size: 18px; line-height: 1.6; }
        .visual { font-size: 12px; color: #666; margin-top: 20px; font-style: italic; }
      </style>
    </head>
    <body>
      ${(slides || []).map((s: any) => `
        <div class="slide">
          <div class="number">${s.slide_number}</div>
          <div class="title">${s.title || ""}</div>
          <div class="content">${s.content || ""}</div>
          <div class="visual">Visual direction: ${s.image_prompt || ""}</div>
        </div>
      `).join("")}
    </body>
  </html>
`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="carousel-${id}.html"`,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
