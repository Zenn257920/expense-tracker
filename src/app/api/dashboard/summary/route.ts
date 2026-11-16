import { connection } from "next/server";
import { and, eq, gte, lt, sql, sum } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { DEMO_USER_ID } from "@/lib/demo-user";

function toCents(value: string | null): bigint {
  if (!value) return 0n;

  const [whole, fraction = ""] = value.split(".");

  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

function formatAmount(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;

  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");

  return `${sign}${whole}.${fraction}`;
}

export async function GET() {
  await connection();

  try {
    const now = new Date();
    const startOfNextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    )
      .toISOString()
      .slice(0, 10);

    const startOfTrend = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
    )
      .toISOString()
      .slice(0, 10);

    const totalResult = await db
      .select({
        type: categories.type,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, DEMO_USER_ID))
      .groupBy(categories.type);

    // Aggregate the chart values by month and transaction type.
    const monthlyTrendResult = await db
      .select({
        month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
        type: categories.type,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, DEMO_USER_ID),
          gte(transactions.transactionDate, startOfTrend),
          lt(transactions.transactionDate, startOfNextMonth),
        ),
      )
      .groupBy(
        sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
        categories.type,
      );

    // Calculate all-time totals.
    const totalIncome = toCents(
      totalResult.find((item) => item.type === "income")?.total ?? null,
    );

    const totalExpenses = toCents(
      totalResult.find((item) => item.type === "expense")?.total ?? null,
    );

    const trendTotals = new Map<string, { income: bigint; expenses: bigint }>();

    for (const item of monthlyTrendResult) {
      const totals = trendTotals.get(item.month) ?? {
        income: 0n,
        expenses: 0n,
      };

      if (item.type === "income") {
        totals.income = toCents(item.total);
      } else {
        totals.expenses = toCents(item.total);
      }

      trendTotals.set(item.month, totals);
    }

    const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
      );
      const monthKey = monthDate.toISOString().slice(0, 7);
      const totals = trendTotals.get(monthKey) ?? {
        income: 0n,
        expenses: 0n,
      };

      return {
        month: monthDate.toLocaleString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),
        income: formatAmount(totals.income),
        expenses: formatAmount(totals.expenses),
      };
    });

    // Calculate current balance.
    const balance = totalIncome - totalExpenses;

    // Return totals and the monthly chart series.
    return Response.json({
      success: true,
      data: {
        totalIncome: formatAmount(totalIncome),
        totalExpenses: formatAmount(totalExpenses),
        balance: formatAmount(balance),

        monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return Response.json(
      { message: "Failed to retrieve dashboard summary" },
      { status: 500 },
    );
  }
}
