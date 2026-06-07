import NextAuth, { type NextAuthConfig } from "next-auth"
import LinkedIn from "next-auth/providers/linkedin"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }

  interface User {
    id?: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string
    email?: string | null
    name?: string | null
    picture?: string | null
  }
}

const config: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
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
    async signIn({ user, account }) {
      console.log("nextauth_signin", { provider: account?.provider, email: user.email })
      return true
    },
    async jwt({ token, user, trigger }) {
      if (trigger === "signIn" && user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = String(token.id || "")
      session.user.email = String(token.email || "")
      session.user.name = token.name || null
      session.user.image = token.picture || null
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
