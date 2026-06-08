import NextAuth, { type NextAuthConfig, type DefaultSession } from "next-auth"
import LinkedIn from "next-auth/providers/linkedin"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
  interface JWT {
    id?: string
    email?: string
    name?: string
    picture?: string
  }
}

const config: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: { params: { scope: "openid profile email" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
      console.log("Sign-in attempt:", user.email)
      return true
    },
    async jwt({ token, user, trigger }) {
      if (trigger === "signIn" && user) {
        token.id = user.id
        token.email = user.email ?? undefined
        token.name = user.name ?? undefined
        token.picture = user.image ?? undefined
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.email = token.email as string
      session.user.name = (token.name as string) ?? null
      session.user.image = (token.picture as string) ?? null
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
