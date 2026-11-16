import { connection } from "next/server";

import { getAuthSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";
import { getDashboardSummary } from "@/lib/services/dashboard-service";

export async function GET() {
  await connection();
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const data = await getDashboardSummary(session.user.id);
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to retrieve dashboard summary");
  }
}
