import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
