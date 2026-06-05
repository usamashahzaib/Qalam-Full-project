import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { ok: true, message: "Use Clerk signOut on the client." },
    { status: 200 }
  )
}
