import { apiClient } from "@/lib/api-client";
import type {
  Category,
  DashboardSummary,
  RecentTransaction,
  TransactionType,
} from "@/types/dashboard";

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

export interface TransactionFilters {
  page: number;
  limit: number;
  search: string;
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

export const api = {
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
