import { apiClient } from "@/lib/api-client";
import type {
  Category,
  DashboardSummary,
  RecentTransaction,
} from "@/types/dashboard";
import type { CreateLoanInput, Loan, LoanStatus } from "@/types/loan";
import type {
  ApiResponse,
  CategoryInput,
  LoanApiRecord,
  LoanPaymentHistory,
  LoanPaymentInput,
  LoanListResponse,
  LoanUpdateInput,
  TransactionFilters,
  TransactionInput,
  TransactionListResponse,
  TransactionUpdateInput,
} from "@/types/api";

const pendingGetRequests = new Map<string, Promise<unknown>>();

function getOnce<T>(key: string, request: () => Promise<T>): Promise<T> {
  const existingRequest = pendingGetRequests.get(key);
  if (existingRequest) return existingRequest as Promise<T>;

  const newRequest = request();
  pendingGetRequests.set(key, newRequest);

  const removeRequest = () => {
    if (pendingGetRequests.get(key) === newRequest) {
      pendingGetRequests.delete(key);
    }
  };

  newRequest.then(removeRequest, removeRequest);
  return newRequest;
}

function mapLoan(record: LoanApiRecord): Loan {
  return {
    id: record.id,
    personName: record.personName,
    type: record.type,
    amount: Number(record.amount),
    paidAmount: Number(record.paidAmount),
    remainingAmount: Number(record.remainingAmount),
    borrowedDate: record.startDate,
    dueDate: record.dueDate,
    interestRate: Number(record.interestRate),
    status: record.status,
    description: record.description ?? undefined,
  };
}

export const api = {
  async getLoans() {
    return getOnce("GET /loans", async () => {
      const response = await apiClient.get<LoanListResponse>("/loans");
      return {
        loans: response.data.data.map(mapLoan),
        recentPayments: response.data.recentPayments,
      };
    });
  },

  async createLoan(input: CreateLoanInput) {
    await apiClient.post<{ message: string; data: unknown }>("/loans", input);
  },

  async updateLoan(id: string, input: LoanUpdateInput) {
    await apiClient.patch<ApiResponse<unknown>>(`/loans/${id}`, input);
  },

  async deleteLoan(id: string) {
    await apiClient.delete(`/loans/${id}`);
  },

  async createLoanPayment(id: string, input: LoanPaymentInput) {
    const response = await apiClient.post<
      ApiResponse<{
        payment: {
          id: string;
          loanId: string;
          amount: number;
          paymentDate: string;
          note: string | null;
          createdAt: string;
        };
        loan: {
          id: string;
          paidAmount: number;
          remainingAmount: number;
          status: LoanStatus;
        };
      }>
    >(`/loans/${id}/payments`, input);
    return response.data.data;
  },

  async getLoanPayments(id: string) {
    const response = await apiClient.get<ApiResponse<LoanPaymentHistory>>(
      `/loans/${id}/payments`,
    );
    return response.data.data;
  },

  async updateLoanPayment(
    loanId: string,
    paymentId: string,
    input: Partial<LoanPaymentInput>,
  ) {
    await apiClient.patch<ApiResponse<unknown>>(
      `/loans/${loanId}/payments/${paymentId}`,
      input,
    );
  },

  async deleteLoanPayment(loanId: string, paymentId: string) {
    await apiClient.delete(`/loans/${loanId}/payments/${paymentId}`);
  },

  async getCategories() {
    return getOnce("GET /categories", async () => {
      const response =
        await apiClient.get<ApiResponse<Category[]>>("/categories");
      return response.data.data;
    });
  },

  async createCategory(input: CategoryInput) {
    const response = await apiClient.post<ApiResponse<Category>>(
      "/categories",
      input,
    );
    return response.data.data;
  },

  async updateCategory(id: string, input: CategoryInput) {
    const response = await apiClient.patch<ApiResponse<Category>>(
      `/categories/${id}`,
      input,
    );
    return response.data.data;
  },

  async deleteCategory(id: string) {
    await apiClient.delete(`/categories/${id}`);
  },

  async getDashboardSummary() {
    return getOnce("GET /dashboard/summary", async () => {
      const response =
        await apiClient.get<ApiResponse<DashboardSummary>>(
          "/dashboard/summary",
        );
      return response.data.data;
    });
  },

  async getTransactions(filters: TransactionFilters) {
    const requestKey = `GET /transactions ${JSON.stringify(filters)}`;
    return getOnce(requestKey, async () => {
      const response = await apiClient.get<TransactionListResponse>(
        "/transactions",
        { params: filters },
      );
      return response.data;
    });
  },

  async createTransaction(input: TransactionInput) {
    const response = await apiClient.post<ApiResponse<RecentTransaction>>(
      "/transactions",
      input,
    );
    return response.data.data;
  },

  async updateTransaction(id: string, input: TransactionUpdateInput) {
    const response = await apiClient.patch<ApiResponse<RecentTransaction>>(
      `/transactions/${id}`,
      input,
    );
    return response.data.data;
  },

  async deleteTransaction(id: string) {
    await apiClient.delete(`/transactions/${id}`);
  },
};
