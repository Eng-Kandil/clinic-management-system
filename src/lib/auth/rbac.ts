import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = "admin" | "doctor" | "patient" | "security_officer" | "receptionist";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContext {
  user: AuthUser;
}

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<NextResponse | Response>;

// ---------------------------------------------------------------------------
// Permission check
// ---------------------------------------------------------------------------

/**
 * Returns `true` when `userRole` is included in the `requiredRoles` list.
 *
 * If `requiredRoles` is empty or undefined every authenticated user passes.
 */
export function checkPermission(
  userRole: Role,
  requiredRoles?: Role[]
): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

// ---------------------------------------------------------------------------
// withAuth higher-order wrapper for App Router route handlers
// ---------------------------------------------------------------------------

/**
 * Wraps a Next.js App Router route handler with authentication and optional
 * role-based authorisation.
 *
 * @example
 * ```ts
 * // Any authenticated user
 * export const GET = withAuth(async (req, { user }) => {
 *   return NextResponse.json({ message: `Hello ${user.name}` });
 * });
 *
 * // Only admin and doctor
 * export const GET = withAuth(async (req, { user }) => {
 *   return NextResponse.json({ data: "sensitive" });
 * }, ["admin", "doctor"]);
 * ```
 */
export function withAuth(handler: AuthenticatedHandler, allowedRoles?: Role[]) {
  return async (req: NextRequest): Promise<NextResponse | Response> => {
    try {
      const session = await auth();

      if (!session?.user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const { user } = session;

      if (!checkPermission(user.role, allowedRoles)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email!,
        name: user.name!,
        role: user.role,
      };

      return handler(req, { user: authUser });
    } catch (error) {
      console.error("withAuth error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
