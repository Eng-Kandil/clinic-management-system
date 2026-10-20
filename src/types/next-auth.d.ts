import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "doctor" | "patient" | "security_officer" | "receptionist";
      name: string;
      email: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "admin" | "doctor" | "patient" | "security_officer" | "receptionist";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "admin" | "doctor" | "patient" | "security_officer" | "receptionist";
    name: string;
  }
}
