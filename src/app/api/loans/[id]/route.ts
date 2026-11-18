import { z } from "zod";

import { apiErrorResponse, ApiError, readJson } from "@/lib/api-error";
import { getAuthSession } from "@/lib/auth-session";
import { deleteLoan, updateLoan } from "@/lib/services/loan-service";

const loanIdSchema = z.uuid();

function validateLoanId(id: string) {
  if (!loanIdSchema.safeParse(id).success) {
    throw new ApiError("Invalid loan ID", 400);
  }
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/loans/[id]">) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    validateLoanId(id);
    const data = await updateLoan(session.user.id, id, await readJson(request));
    return Response.json({ success: true, message: "Loan updated successfully", data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update loan");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/loans/[id]">) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    validateLoanId(id);
    const data = await deleteLoan(session.user.id, id);
    return Response.json({ success: true, message: "Loan deleted successfully", data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete loan");
  }
}
