export type TransactionType = "income" | "expense";

export interface RecentTransaction {
  id: string;
  categoryId: string;
  description: string;
  amount: string;
  transactionDate: string;
  categoryName: string;
  type: TransactionType;
}

export interface DashboardSummary {
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  monthlyTrend: MonthlyTrendPoint[];
  dailyTrend: DailyTrendPoint[];
  /** This month (Yangon) totals, for the "This month" section. */
  thisMonthIncome: string;
  thisMonthExpenses: string;
  /** Per-category totals for the current month, largest first. */
  categoryBreakdown: CategoryBreakdownPoint[];
  /** Loan cash flow in the current month. Kept separate from transactions
   * (and from the balance formula) so nothing is double-counted. */
  loanRepaidThisMonth: string;
  loanReceivedThisMonth: string;
  /** Outstanding loan balances (already inside the balance formula). */
  borrowedRemaining: string;
  lentRemaining: string;
}

export interface CategoryBreakdownPoint {
  categoryName: string;
  type: TransactionType;
  total: string;
}

export interface MonthlyTrendPoint {
  month: string;
  income: string;
  expenses: string;
}

export interface DailyTrendPoint {
  date: string;
  income: string;
  expenses: string;
}

export interface DashboardApiResponse {
  success: boolean;
  data: DashboardSummary;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}
