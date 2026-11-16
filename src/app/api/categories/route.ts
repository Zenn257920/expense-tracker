import { connection } from "next/server";

import { getAuthSession } from "@/lib/auth-session";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { createCategory, listCategories } from "@/lib/services/category-service";

export async function GET() {
  await connection();
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const data = await listCategories(session.user.id);
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to retrieve categories");
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const data = await createCategory(session.user.id, await readJson(request));
    return Response.json({ success: true, message: "Category created successfully", data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create category");
  }
}
