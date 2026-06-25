import NextAuth, { type NextAuthConfig, type DefaultSession } from "next-auth"
import LinkedIn from "next-auth/providers/linkedin"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { verifyPassword } from "@/lib/server/password"
import { log } from "@/lib/server/logging"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      provider?: string
      passwordVersion?: number
    } & DefaultSession["user"]
  }
  interface JWT {
    id?: string
    email?: string
    name?: string
    picture?: string
    provider?: string
    passwordVersion?: number
  }
}

const config: NextAuthConfig = {
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: { params: { scope: "openid profile email" } },
    }),

    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim()
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        try {
          const supabase = createServiceClient()
          const { data: user } = await supabase
            .from("users")
            .select("id, email, full_name, password_hash, email_verified")
            .eq("email", email)
            .maybeSingle()

          if (!user?.password_hash) return null

          const valid = verifyPassword(password, user.password_hash)
          if (!valid) return null
          if (!user.email_verified) return null

          return { id: user.id, email: user.email, name: user.full_name ?? "" }
        } catch (err) {
          log.error("auth.authorize_failed", { error: (err as Error).message })
          return null
        }
      },
    }),
  ],

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },

  callbacks: {
    async signIn({ user, account }) {
      log.info("auth.sign_in", { provider: account?.provider, email: user.email })
      return true
    },

    async jwt({ token, user, account, trigger }) {
      if (trigger === "signIn" && user) {
        token.id = user.id
        token.email = user.email ?? undefined
        token.name = user.name ?? undefined
        token.picture = user.image ?? undefined
        token.provider = account?.provider ?? "credentials"
        // Embed password_version so sessions are invalidated on password change.
        // Requires: ALTER TABLE users ADD COLUMN password_version INTEGER DEFAULT 0 NOT NULL
        if ((account?.provider ?? "credentials") === "credentials") {
          try {
            const supabase = createServiceClient()
            const { data: u } = await supabase
              .from("users")
              .select("password_version")
              .eq("id", user.id)
              .maybeSingle()
            token.passwordVersion = (u as { password_version?: number } | null)?.password_version ?? 0
          } catch { /* column may not exist yet */ }
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.email = token.email as string
      session.user.name = (token.name as string) ?? null
      session.user.image = (token.picture as string) ?? null
      session.user.provider = (token.provider as string) ?? "credentials"
      session.user.passwordVersion = token.passwordVersion as number | undefined
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
