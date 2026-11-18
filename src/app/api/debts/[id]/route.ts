import { z } from "zod";

import { apiErrorResponse, ApiError, readJson } from "@/lib/api-error";
import { getAuthSession } from "@/lib/auth-session";
import { deleteDebt, updateDebt } from "@/lib/services/debt-service";

const debtIdSchema = z.uuid();

function validateDebtId(id: string) {
  if (!debtIdSchema.safeParse(id).success) {
    throw new ApiError("Invalid debt ID", 400);
  }
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/debts/[id]">) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    validateDebtId(id);
    const data = await updateDebt(session.user.id, id, await readJson(request));
    return Response.json({ success: true, message: "Debt updated successfully", data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update debt");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/debts/[id]">) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    validateDebtId(id);
    const data = await deleteDebt(session.user.id, id);
    return Response.json({ success: true, message: "Debt deleted successfully", data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete debt");
  }
}
