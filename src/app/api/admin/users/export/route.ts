import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { withAuth } from "@/lib/auth/rbac";
import { errorResponse } from "@/lib/utils/api-response";
import { User } from "@/lib/db/models/User";

// ---------------------------------------------------------------------------
// GET /api/admin/users/export — Full user list as CSV (admin only)
// ---------------------------------------------------------------------------

export const GET = withAuth(async (_req: NextRequest) => {
  try {
    await connectDB();

    const users = await User.find({})
      .select("name email role isActive createdAt")
      .lean();

    const header = "id,name,email,role,isActive,createdAt\n";
    const rows = users
      .map((u: { _id: unknown; name?: string; email?: string; role?: string; isActive?: boolean; createdAt?: Date | string }) => {
        const name = (u.name ?? "").replace(/"/g, '""');
        const email = (u.email ?? "").replace(/"/g, '""');
        const createdAt = u.createdAt instanceof Date ? u.createdAt.toISOString() : (u.createdAt ?? "");
        return `${u._id},"${name}","${email}",${u.role},${u.isActive},${createdAt}`;
      })
      .join("\n");

    return new Response(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="users.csv"',
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Users Export GET] Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}, ["admin"]);
