import NextAuth, { type NextAuthConfig, type DefaultSession } from "next-auth"
import LinkedIn from "next-auth/providers/linkedin"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { verifyPassword } from "@/lib/server/password"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      provider?: string
    } & DefaultSession["user"]
  }
  interface JWT {
    id?: string
    email?: string
    name?: string
    picture?: string
    provider?: string
  }
}

const config: NextAuthConfig = {
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
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

          return { id: user.id, email: user.email, name: user.full_name ?? "" }
        } catch {
          return null
        }
      },
    }),
  ],

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },

  callbacks: {
    async signIn({ user, account }) {
      // Allow all sign-ins; provisioning happens lazily in requireAuthApi
      console.log("[auth] sign-in", account?.provider, user.email)
      return true
    },

    async jwt({ token, user, account, trigger }) {
      if (trigger === "signIn" && user) {
        token.id = user.id
        token.email = user.email ?? undefined
        token.name = user.name ?? undefined
        token.picture = user.image ?? undefined
        token.provider = account?.provider ?? "credentials"
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.email = token.email as string
      session.user.name = (token.name as string) ?? null
      session.user.image = (token.picture as string) ?? null
      session.user.provider = (token.provider as string) ?? "credentials"
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
