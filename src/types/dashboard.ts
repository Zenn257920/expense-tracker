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
  dailyExpenses: DailyExpensePoint[];
}

export interface MonthlyTrendPoint {
  month: string;
  income: string;
  expenses: string;
}

export interface DailyExpensePoint {
  date: string;
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
