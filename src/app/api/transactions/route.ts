import { getAuthSession } from "@/lib/auth-session";
import { apiErrorResponse, readJson } from "@/lib/api-error";
import { createTransaction, listTransactions } from "@/lib/services/transaction-service";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const params = new URL(request.url).searchParams;
    const result = await listTransactions(session.user.id, {
      categoryId: params.get("categoryId"),
      type: params.get("type"),
      startDate: params.get("startDate"),
      endDate: params.get("endDate"),
      search: params.get("search") ?? "",
      page: params.get("page"),
      limit: params.get("limit"),
    });
    return Response.json({ success: true, ...result });
  } catch (error) {
    return apiErrorResponse(error, "Failed to retrieve transactions");
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const data = await createTransaction(session.user.id, await readJson(request));
    return Response.json({ success: true, message: "Transaction created successfully", data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create transaction");
  }
}
