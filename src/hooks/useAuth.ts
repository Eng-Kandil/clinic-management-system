"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    session,
    user: session?.user as
      | {
          id: string;
          role: "admin" | "doctor" | "patient" | "security_officer";
          name: string;
          email: string;
        }
      | undefined,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
