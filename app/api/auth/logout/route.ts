import { NextResponse } from "next/server"
import { appSessionCookieName } from "@/lib/server/app-session"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: appSessionCookieName,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  return response
}
