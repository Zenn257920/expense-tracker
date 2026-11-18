export type DebtType = "borrowed" | "lent";

export type DebtStatus = "active" | "partially_paid" | "paid" | "overdue";

export interface Debt {
  id: string;
  personName: string;
  type: DebtType;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  borrowedDate: string;
  dueDate: string;
  status: DebtStatus;
  description?: string;
  interestRate: number;
}

export interface CreateDebtInput {
  personName: string;
  type: DebtType;
  amount: number;
  borrowedDate: string;
  dueDate: string;
  interestRate: number;
  description?: string;
}
