import { z } from "zod";

import { ApiError, apiErrorResponse, readJson } from "@/lib/api-error";
import { getAuthSession } from "@/lib/auth-session";
import {
  deleteLoanPayment,
  updateLoanPayment,
} from "@/lib/services/loan-payment-service";

type PaymentRouteContext = {
  params: Promise<{ id: string; paymentId: string }>;
};

const uuidSchema = z.uuid();

function validateIds(id: string, paymentId: string) {
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(paymentId).success) {
    throw new ApiError("Invalid loan or payment ID", 400);
  }
}

export async function PATCH(request: Request, { params }: PaymentRouteContext) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id, paymentId } = await params;
    validateIds(id, paymentId);
    const data = await updateLoanPayment(
      session.user.id,
      id,
      paymentId,
      await readJson(request),
    );
    return Response.json({ success: true, message: "Payment updated successfully", data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to update loan payment");
  }
}

export async function DELETE(_request: Request, { params }: PaymentRouteContext) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id, paymentId } = await params;
    validateIds(id, paymentId);
    const data = await deleteLoanPayment(session.user.id, id, paymentId);
    return Response.json({ success: true, message: "Payment deleted successfully", data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete loan payment");
  }
}
