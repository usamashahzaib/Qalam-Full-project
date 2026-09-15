import { NextRequest } from "next/server"
import { handleReviewDecision } from "@/lib/server/agency/approval-routes"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleReviewDecision(request, params, "rejected")
}
