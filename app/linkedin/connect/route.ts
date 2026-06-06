import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/clerk-client";

export async function GET() {
  try {
    await requireAuth();

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (
      !clientId ||
      !clientSecret ||
      clientId.includes("placeholder") ||
      clientSecret.includes("placeholder")
    ) {
      return NextResponse.json(
        { error: "LinkedIn integration is not configured. Contact support to enable." },
        { status: 503 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`;
    const state = Buffer.from(crypto.randomUUID()).toString("base64");

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent("openid profile email w_member_social")}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
