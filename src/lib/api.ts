import { apiClient } from "@/lib/api-client";
import type {
  Category,
  DashboardSummary,
  RecentTransaction,
  TransactionType,
} from "@/types/dashboard";
import type { CreateDebtInput, Debt, DebtStatus, DebtType } from "@/types/debt";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

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

export interface TransactionListResponse {
  success: boolean;
  data: RecentTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface DebtApiRecord {
  id: string;
  personName: string;
  type: DebtType;
  amount: number | string;
  paidAmount: number | string;
  remainingAmount: number | string;
  startDate: string;
  dueDate: string;
  interestRate: number | string;
  status: DebtStatus;
  description: string | null;
}

export interface RecentDebtPayment {
  id: string;
  personName: string;
  type: DebtType;
  amount: number;
  paymentDate: string;
  note: string | null;
}

interface DebtListResponse {
  message: string;
  data: DebtApiRecord[];
  recentPayments: RecentDebtPayment[];
}

function mapDebt(record: DebtApiRecord): Debt {
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

export interface TransactionFilters {
  page: number;
  limit: number;
  search: string;
  type?: TransactionType | "all";
}

export interface CategoryInput {
  name: string;
  type: TransactionType;
}

export interface TransactionInput {
  categoryId: string;
  description: string;
  amount: number;
  transactionDate: string;
}

export type TransactionUpdateInput = Partial<TransactionInput>;

export interface DebtUpdateInput {
  personName?: string;
  type?: DebtType;
  amount?: number;
  interestRate?: number;
  startDate?: string;
  dueDate?: string;
  description?: string | null;
}

export interface DebtPaymentInput {
  amount: number;
  paymentDate: string;
  note?: string;
}

export interface DebtPaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  note: string | null;
  createdAt: string;
}

export interface DebtPaymentHistory {
  payments: DebtPaymentRecord[];
  debt: {
    id: string;
    originalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paymentCount: number;
    status: DebtStatus;
  };
}

export const api = {
  async getDebts() {
    return getOnce("GET /debts", async () => {
      const response = await apiClient.get<DebtListResponse>("/debts");
      return {
        debts: response.data.data.map(mapDebt),
        recentPayments: response.data.recentPayments,
      };
    });
  },

  async createDebt(input: CreateDebtInput) {
    await apiClient.post<{ message: string; data: unknown }>("/debts", input);
  },

  async updateDebt(id: string, input: DebtUpdateInput) {
    await apiClient.patch<ApiResponse<unknown>>(`/debts/${id}`, input);
  },

  async deleteDebt(id: string) {
    await apiClient.delete(`/debts/${id}`);
  },

  async createDebtPayment(id: string, input: DebtPaymentInput) {
    const response = await apiClient.post<ApiResponse<{
      payment: { id: string; debtId: string; amount: number; paymentDate: string; note: string | null; createdAt: string };
      debt: { id: string; paidAmount: number; remainingAmount: number; status: DebtStatus };
    }>>(`/debts/${id}/payments`, input);
    return response.data.data;
  },

  async getDebtPayments(id: string) {
    const response = await apiClient.get<ApiResponse<DebtPaymentHistory>>(
      `/debts/${id}/payments`,
    );
    return response.data.data;
  },

  async updateDebtPayment(
    debtId: string,
    paymentId: string,
    input: Partial<DebtPaymentInput>,
  ) {
    await apiClient.patch<ApiResponse<unknown>>(
      `/debts/${debtId}/payments/${paymentId}`,
      input,
    );
  },

  async deleteDebtPayment(debtId: string, paymentId: string) {
    await apiClient.delete(`/debts/${debtId}/payments/${paymentId}`);
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
