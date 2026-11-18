import { and, eq, gte, lt, sql, sum } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";

function toCents(value: string | null) {
  if (!value) return 0n;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

function formatAmount(cents: bigint) {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

export async function getDashboardSummary(userId: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const startOfMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const startOfTomorrow = new Date(Date.UTC(year, month, now.getUTCDate() + 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const startOfTrend = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)).toISOString().slice(0, 10);

  const [totals, monthlyResults, dailyExpenseResults] = await Promise.all([
    db.select({ type: categories.type, total: sum(transactions.amount) })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .groupBy(categories.type),
    db.select({
      month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
      type: categories.type,
      total: sum(transactions.amount),
    })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, startOfTrend),
        lt(transactions.transactionDate, startOfNextMonth),
      ))
      .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`, categories.type),
    db.select({ date: transactions.transactionDate, total: sum(transactions.amount) })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(categories.type, "expense"),
        gte(transactions.transactionDate, startOfMonth),
        lt(transactions.transactionDate, startOfTomorrow),
      ))
      .groupBy(transactions.transactionDate),
  ]);

  const totalIncome = toCents(totals.find((item) => item.type === "income")?.total ?? null);
  const totalExpenses = toCents(totals.find((item) => item.type === "expense")?.total ?? null);
  const trend = new Map<string, { income: bigint; expenses: bigint }>();

  for (const item of monthlyResults) {
    const values = trend.get(item.month) ?? { income: 0n, expenses: 0n };
    if (item.type === "income") values.income = toCents(item.total);
    else values.expenses = toCents(item.total);
    trend.set(item.month, values);
  }

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const key = date.toISOString().slice(0, 7);
    const values = trend.get(key) ?? { income: 0n, expenses: 0n };
    return {
      month: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      income: formatAmount(values.income),
      expenses: formatAmount(values.expenses),
    };
  });

  const dailyExpenseTotals = new Map(
    dailyExpenseResults.map((item) => [item.date, toCents(item.total)]),
  );
  const dailyExpenses = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index + 1)).toISOString().slice(0, 10);
    return {
      date,
      expenses: formatAmount(dailyExpenseTotals.get(date) ?? 0n),
    };
  });

  return {
    totalIncome: formatAmount(totalIncome),
    totalExpenses: formatAmount(totalExpenses),
    balance: formatAmount(totalIncome - totalExpenses),
    monthlyTrend,
    dailyExpenses,
  };
}
