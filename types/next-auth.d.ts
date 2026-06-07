import { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      firstName: string
      role: "admin" | "user"
      linkedinMemberId?: string | null
      linkedinTokenExpiresAt?: number | null
    } & DefaultSession["user"]
  }
}
