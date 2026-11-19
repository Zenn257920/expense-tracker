import { apiErrorResponse, readJson } from "@/lib/api-error";
import { getAuthSession } from "@/lib/auth-session";
import { createLoan, listLoans } from "@/lib/services/loan-service";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await createLoan(session.user.id, await readJson(request));
    return Response.json(
      { success: true, message: "Loan created successfully", data },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to create loan");
  }
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await listLoans(session.user.id);
    return Response.json({
      success: true,
      message: "Loans retrieved successfully",
      ...result,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to retrieve loans");
  }
}
