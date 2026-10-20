import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { AuditLog } from "@/lib/db/models/AuditLog";
import { createAuditLog } from "@/lib/utils/audit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          await connectDB();

          const user = await User.findOne({ email: email.toLowerCase() }).select(
            "+password"
          );

          if (!user || !user.password) {
            return null;
          }

          // Check if account is temporarily locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            await createAuditLog({
              userId: "unknown",
              action: "LOGIN_FAILED",
              resource: "Auth",
              details: `Failed login attempt for email: ${email}`,
              ipAddress: "unknown",
              userAgent: "unknown",
              severity: "warning",
            });

            // Lock account after reaching the failure threshold within the window
            const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
            const MAX_ATTEMPTS = 5;
            const recentFailures = await AuditLog.countDocuments({
              action: "LOGIN_FAILED",
              details: { $regex: email, $options: "i" },
              createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
            });
            if (recentFailures >= MAX_ATTEMPTS - 1) {
              await User.findByIdAndUpdate(user._id, {
                lockedUntil: new Date(Date.now() + WINDOW_MS),
              });
            }

            return null;
          }

          if (!user.isActive) {
            await createAuditLog({
              userId: user._id.toString(),
              action: "LOGIN_BLOCKED_INACTIVE",
              resource: "Auth",
              details: `Login blocked for inactive account: ${user.email}`,
              ipAddress: "unknown",
              userAgent: "unknown",
              severity: "warning",
            });
            return null;
          }

          await createAuditLog({
            userId: user._id.toString(),
            action: "LOGIN_SUCCESS",
            resource: "Auth",
            details: `Successful login for: ${user.email}`,
            ipAddress: "unknown",
            userAgent: "unknown",
            severity: "info",
          });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[auth] Error:", error);
          } else {
            console.error("[auth] Authentication error occurred");
          }
          return null;
        }
      },
    }),
  ],
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
        token.role = user.role as "admin" | "doctor" | "patient" | "security_officer";
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
