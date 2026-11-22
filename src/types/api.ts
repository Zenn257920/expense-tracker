import type {
  RecentTransaction,
  TransactionType,
} from "@/types/dashboard";
import type { LoanStatus, LoanType } from "@/types/loan";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface LoanApiRecord {
  id: string;
  personName: string;
  type: LoanType;
  amount: number | string;
  paidAmount: number | string;
  remainingAmount: number | string;
  startDate: string;
  dueDate: string;
  interestRate: number | string;
  status: LoanStatus;
  description: string | null;
}

export interface LoanListResponse {
  success: boolean;
  message: string;
  data: LoanApiRecord[];
  recentPayments: RecentLoanPayment[];
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
  /** Totals over the filtered query (not just the returned page). */
  totals: { income: number; expense: number; count: number };
}

export interface TransactionFilters {
  page: number;
  limit: number;
  search: string;
  type?: TransactionType | "all";
  categoryId?: string;
  startDate?: string;
  endDate?: string;
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

export interface LoanUpdateInput {
  personName?: string;
  type?: LoanType;
  amount?: number;
  interestRate?: number;
  borrowedDate?: string;
  dueDate?: string;
  description?: string | null;
}

export interface LoanPaymentInput {
  amount: number;
  paymentDate: string;
  note?: string;
}

export interface LoanPaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  note: string | null;
  createdAt: string;
}

export interface LoanPaymentHistory {
  payments: LoanPaymentRecord[];
  loan: {
    id: string;
    originalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paymentCount: number;
    status: LoanStatus;
  };
}

export interface RecentLoanPayment {
  id: string;
  personName: string;
  type: LoanType;
  amount: number;
  paymentDate: string;
  note: string | null;
}

