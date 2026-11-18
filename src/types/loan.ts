export type LoanType = "borrowed" | "lent";

export type LoanStatus = "active" | "partially_paid" | "paid" | "overdue";

export interface Loan {
  id: string;
  personName: string;
  type: LoanType;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  borrowedDate: string;
  dueDate: string;
  status: LoanStatus;
  description?: string;
  interestRate: number;
}

export interface CreateLoanInput {
  personName: string;
  type: LoanType;
  amount: number;
  borrowedDate: string;
  dueDate: string;
  interestRate: number;
  description?: string;
}
