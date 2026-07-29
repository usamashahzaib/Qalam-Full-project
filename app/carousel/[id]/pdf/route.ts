import { NextResponse } from "next/server"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return NextResponse.redirect(new URL(`/carousels/${encodeURIComponent(id)}`, request.url), 308)
}
