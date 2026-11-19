import type { LoanStatus } from "@/types/loan";

export function getLoanStatus(
  remainingAmount: number,
  paidAmount: number,
  dueDate: string,
  today = new Date().toISOString().slice(0, 10),
): LoanStatus {
  if (remainingAmount <= 0) return "paid";
  if (dueDate < today) return "overdue";
  if (paidAmount > 0) return "partially_paid";
  return "active";
}
