import { getYangonParts, toDateString } from "@/lib/yangon-date";
import type { Loan } from "@/types/loan";

export interface LoanOverview {
  borrowedTotal: number;
  lentTotal: number;
  upcomingTotal: number;
  overdueTotal: number;
  upcomingLoans: Loan[];
  overdueLoans: Loan[];
}

function remainingBalance(loan: Loan) {
  return Math.max(0, loan.remainingAmount);
}

export function calculateLoanOverview(loans: Loan[], now = new Date()): LoanOverview {
  // "Today" and "next week" are Yangon calendar dates, not UTC.
  const { year, month, day } = getYangonParts(now);
  const today = toDateString(year, month, day);
  const nextWeekKey = toDateString(year, month, day + 7);

  const overdueLoans = loans
    .filter((loan) => remainingBalance(loan) > 0 && loan.dueDate.slice(0, 10) < today)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  const upcomingLoans = loans
    .filter((loan) => {
      const dueDate = loan.dueDate.slice(0, 10);
      return remainingBalance(loan) > 0 && dueDate >= today && dueDate <= nextWeekKey;
    })
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  return {
    borrowedTotal: loans
      .filter((loan) => loan.type === "borrowed")
      .reduce((total, loan) => total + remainingBalance(loan), 0),
    lentTotal: loans
      .filter((loan) => loan.type === "lent")
      .reduce((total, loan) => total + remainingBalance(loan), 0),
    upcomingTotal: upcomingLoans.reduce((total, loan) => total + remainingBalance(loan), 0),
    overdueTotal: overdueLoans.reduce((total, loan) => total + remainingBalance(loan), 0),
    upcomingLoans,
    overdueLoans,
  };
}

export function calculateLoanProgress(loan: Pick<Loan, "amount" | "paidAmount">) {
  if (loan.amount <= 0) return 0;
  return Math.min(100, Math.max(0, (loan.paidAmount / loan.amount) * 100));
}
