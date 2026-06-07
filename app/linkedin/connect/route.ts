import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const next = new URL(request.url).searchParams.get("next") || "/dashboard";
  const url = new URL("/api/auth/signin/linkedin", request.url);
  url.searchParams.set("callbackUrl", next.startsWith("/") ? next : "/dashboard");
  return NextResponse.redirect(url);
}
