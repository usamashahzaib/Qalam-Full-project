import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/workspace";
import { getPlanStatus } from "@/lib/server/plan-limits-v2";

export async function GET() {
  try {
    const userId = await requireAuth();
    const status = await getPlanStatus(userId);
    return NextResponse.json(status);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
