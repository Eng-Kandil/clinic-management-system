// Next.js 16 auth proxy. Runs in the Edge runtime, so it must only import
// edge-safe code. `auth.edge.ts` deliberately omits mongoose/bcrypt/models.
export { auth as proxy } from "@/lib/auth/auth.edge";

export const config = {
  matcher: ["/dashboard/:path*", "/api/((?!auth).*)"],
};
