import NextAuth from "next-auth";

/**
 * Edge-safe NextAuth instance.
 *
 * This config has NO providers and NO database/Node-only imports
 * (no mongoose, no bcryptjs). It is safe to import from `src/proxy.ts`
 * (Next.js 16 auth proxy / edge middleware), where Node APIs are unavailable.
 *
 * The full Node-runtime config (with Credentials provider, MongoDB, bcrypt,
 * audit logging) lives in `auth.config.ts` and is used by the API route
 * handler and any server-side `auth()` calls that need DB access.
 *
 * The JWT session shape is identical between the two configs because the
 * JWT itself is signed/verified using NEXTAUTH_SECRET — the edge instance
 * can read the token without needing to hit the DB.
 */
export const { auth } = NextAuth({
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "strict" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as
          | "admin"
          | "doctor"
          | "patient"
          | "security_officer";
        token.name = user.name as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
