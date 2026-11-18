import type { Debt } from "@/types/debt";

export interface DebtOverview {
  borrowedTotal: number;
  lentTotal: number;
  upcomingTotal: number;
  overdueTotal: number;
  upcomingDebts: Debt[];
  overdueDebts: Debt[];
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function remainingBalance(debt: Debt) {
  return Math.max(0, debt.remainingAmount);
}

export function calculateDebtOverview(debts: Debt[], now = new Date()): DebtOverview {
  const today = localDateKey(now);
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const nextWeekKey = localDateKey(nextWeek);

  const overdueDebts = debts
    .filter((debt) => remainingBalance(debt) > 0 && debt.dueDate.slice(0, 10) < today)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  const upcomingDebts = debts
    .filter((debt) => {
      const dueDate = debt.dueDate.slice(0, 10);
      return remainingBalance(debt) > 0 && dueDate >= today && dueDate <= nextWeekKey;
    })
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  return {
    borrowedTotal: debts
      .filter((debt) => debt.type === "borrowed")
      .reduce((total, debt) => total + remainingBalance(debt), 0),
    lentTotal: debts
      .filter((debt) => debt.type === "lent")
      .reduce((total, debt) => total + remainingBalance(debt), 0),
    upcomingTotal: upcomingDebts.reduce((total, debt) => total + remainingBalance(debt), 0),
    overdueTotal: overdueDebts.reduce((total, debt) => total + remainingBalance(debt), 0),
    upcomingDebts,
    overdueDebts,
  };
}

export function calculateDebtProgress(debt: Pick<Debt, "amount" | "paidAmount">) {
  if (debt.amount <= 0) return 0;
  return Math.min(100, Math.max(0, (debt.paidAmount / debt.amount) * 100));
}
