import { getAuthSession } from "@/lib/auth-session";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { deleteCategory, updateCategory } from "@/lib/services/category-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const data = await updateCategory(session.user.id, id, await readJson(request));
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update category");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const data = await deleteCategory(session.user.id, id);
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete category");
  }
}
