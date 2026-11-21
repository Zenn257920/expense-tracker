import { getYangonDateString } from "@/lib/yangon-date";
import type { LoanStatus } from "@/types/loan";

export function getLoanStatus(
  remainingAmount: number,
  paidAmount: number,
  dueDate: string,
  today = getYangonDateString(),
): LoanStatus {
  if (remainingAmount <= 0) return "paid";
  if (dueDate < today) return "overdue";
  if (paidAmount > 0) return "partially_paid";
  return "active";
}
