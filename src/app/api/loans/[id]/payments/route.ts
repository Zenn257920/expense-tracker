import { z } from "zod";

import { ApiError, apiErrorResponse, readJson } from "@/lib/api-error";
import { getAuthSession } from "@/lib/auth-session";
import {
  createLoanPayment,
  getLoanPayments,
} from "@/lib/services/loan-payment-service";

const loanIdSchema = z.uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    if (!loanIdSchema.safeParse(id).success) {
      throw new ApiError("Invalid loan ID", 400);
    }
    const data = await getLoanPayments(session.user.id, id);
    return Response.json({ success: true, data });
  } catch (error) {
    return apiErrorResponse(error, "Failed to retrieve loan payments");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    if (!loanIdSchema.safeParse(id).success) {
      throw new ApiError("Invalid loan ID", 400);
    }

    const result = await createLoanPayment(
      session.user.id,
      id,
      await readJson(request),
    );

    return Response.json(
      { success: true, message: "Payment recorded successfully", data: result },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to record loan payment");
  }
}
