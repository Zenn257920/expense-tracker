import { and, eq, gte, lt, sql, sum } from "drizzle-orm";

import { db } from "@/db";
import { categories, loans, loanPayments, transactions } from "@/db/schema";
import {
  getYangonParts,
  toDateString,
} from "@/lib/yangon-date";

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
  // Month boundaries are Yangon calendar dates, not UTC (see yangon-date).
  const { year, month, day } = getYangonParts();
  const startOfMonth = toDateString(year, month, 1);
  const startOfTomorrow = toDateString(year, month, day + 1);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startOfNextMonth = toDateString(year, month + 1, 1);
  const startOfTrend = toDateString(year, month - 5, 1);

  const paymentTotals = db
    .select({
      loanId: loanPayments.loanId,
      paidAmount: sum(loanPayments.amount).as("paid_amount"),
    })
    .from(loanPayments)
    .groupBy(loanPayments.loanId)
    .as("payment_totals");

  const [totals, monthlyResults, dailyResults, loanResults, categoryResults, loanPaymentResults] = await Promise.all([
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
    db.select({
      date: transactions.transactionDate,
      type: categories.type,
      total: sum(transactions.amount),
    })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, startOfMonth),
        lt(transactions.transactionDate, startOfTomorrow),
      ))
      .groupBy(transactions.transactionDate, categories.type),
    db.select({
      type: loans.type,
      remainingAmount: sql<string>`coalesce(sum(${loans.amount} - coalesce(${paymentTotals.paidAmount}, 0)), 0)::text`,
    })
      .from(loans)
      .leftJoin(paymentTotals, eq(loans.id, paymentTotals.loanId))
      .where(eq(loans.userId, userId))
      .groupBy(loans.type),
    // Per-category totals for the current (Yangon) month.
    db.select({
      categoryName: categories.name,
      type: categories.type,
      total: sum(transactions.amount),
    })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, startOfMonth),
        lt(transactions.transactionDate, startOfTomorrow),
      ))
      .groupBy(categories.name, categories.type),
    // Loan payments made/received in the current month. A payment on a
    // borrowed loan is money out; on a lent loan it is money in.
    db.select({
      type: loans.type,
      total: sum(loanPayments.amount),
    })
      .from(loanPayments)
      .innerJoin(loans, eq(loanPayments.loanId, loans.id))
      .where(and(
        eq(loans.userId, userId),
        gte(loanPayments.paymentDate, startOfMonth),
        lt(loanPayments.paymentDate, startOfTomorrow),
      ))
      .groupBy(loans.type),
  ]);

  const totalIncome = toCents(totals.find((item) => item.type === "income")?.total ?? null);
  const totalExpenses = toCents(totals.find((item) => item.type === "expense")?.total ?? null);
  const borrowedRemaining = toCents(
    loanResults.find((item) => item.type === "borrowed")?.remainingAmount ?? null,
  );
  const lentRemaining = toCents(
    loanResults.find((item) => item.type === "lent")?.remainingAmount ?? null,
  );
  const trend = new Map<string, { income: bigint; expenses: bigint }>();

  for (const item of monthlyResults) {
    const values = trend.get(item.month) ?? { income: 0n, expenses: 0n };
    if (item.type === "income") values.income = toCents(item.total);
    else values.expenses = toCents(item.total);
    trend.set(item.month, values);
  }

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 5 + index, 1));
    const key = date.toISOString().slice(0, 7);
    const values = trend.get(key) ?? { income: 0n, expenses: 0n };
    return {
      month: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      income: formatAmount(values.income),
      expenses: formatAmount(values.expenses),
    };
  });

  const dailyTotals = new Map<string, { income: bigint; expenses: bigint }>();
  for (const item of dailyResults) {
    const values = dailyTotals.get(item.date) ?? { income: 0n, expenses: 0n };
    if (item.type === "income") values.income = toCents(item.total);
    else values.expenses = toCents(item.total);
    dailyTotals.set(item.date, values);
  }
  const dailyTrend = Array.from({ length: daysInMonth }, (_, index) => {
    const date = toDateString(year, month, index + 1);
    const values = dailyTotals.get(date) ?? { income: 0n, expenses: 0n };
    return {
      date,
      income: formatAmount(values.income),
      expenses: formatAmount(values.expenses),
    };
  });

  let thisMonthIncome = 0n;
  let thisMonthExpenses = 0n;
  for (const values of dailyTotals.values()) {
    thisMonthIncome += values.income;
    thisMonthExpenses += values.expenses;
  }

  const categoryBreakdown = categoryResults
    .map((item) => ({
      categoryName: item.categoryName,
      type: item.type as "income" | "expense",
      total: formatAmount(toCents(item.total)),
    }))
    .sort((a, b) => Number(b.total) - Number(a.total));

  return {
    totalIncome: formatAmount(totalIncome),
    totalExpenses: formatAmount(totalExpenses),
    balance: formatAmount(
      totalIncome - totalExpenses + borrowedRemaining - lentRemaining,
    ),
    monthlyTrend,
    dailyTrend,
    thisMonthIncome: formatAmount(thisMonthIncome),
    thisMonthExpenses: formatAmount(thisMonthExpenses),
    categoryBreakdown,
    loanRepaidThisMonth: formatAmount(toCents(
      loanPaymentResults.find((item) => item.type === "borrowed")?.total ?? null,
    )),
    loanReceivedThisMonth: formatAmount(toCents(
      loanPaymentResults.find((item) => item.type === "lent")?.total ?? null,
    )),
    borrowedRemaining: formatAmount(borrowedRemaining),
    lentRemaining: formatAmount(lentRemaining),
  };
}
