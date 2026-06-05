import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "use_clerk_auth", message: "Authentication is handled by Clerk. Use /auth or Clerk sign-in." },
    { status: 410 }
  )
}
