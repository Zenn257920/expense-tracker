import { getAuthSession } from "@/lib/auth-session";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { deleteTransaction, updateTransaction } from "@/lib/services/transaction-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const data = await updateTransaction(session.user.id, id, await readJson(request));
    return Response.json({ success: true, message: "Transaction updated successfully", data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update transaction");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const data = await deleteTransaction(session.user.id, id);
    return Response.json({ success: true, message: "Transaction deleted successfully", data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete transaction");
  }
}
