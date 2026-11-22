"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import CategoryBreakdown from "@/components/dashboard/category-breakdown";
import SummaryCard from "@/components/dashboard/summary-card";
import MonthlyOverview from "@/components/dashboard/monthly-overview";
import AddTransactionDialog from "@/components/transactions/add-transaction-dialog";
import { useCategories } from "@/hooks/use-categories";
import type { DashboardSummary } from "@/types/dashboard";
import { formatMoney } from "@/lib/format";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";

function signedMoney(value: string | number, positiveSign = "+") {
  const numeric = Number(value);
  const sign = numeric < 0 ? "−" : positiveSign;
  return `${sign}${formatMoney(Math.abs(numeric))}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
    refreshCategories,
  } = useCategories();

  const refreshDashboard = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        const result = await api.getDashboardSummary();

        if (isActive) {
          setError(null);
          setSummary(result);
        }
      } catch (err) {
        if (isActive) {
          setError(getApiErrorMessage(err, "Could not load dashboard data."));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
          setHasLoaded(true);
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  // Full skeleton only on the very first load; a later refresh keeps the
  // loaded dashboard visible instead of flashing the whole page white.
  if (isLoading && !hasLoaded) {
    return <DashboardSkeleton />;
  }

  // Full-page error only when nothing has loaded yet. On a later refresh
  // the loaded dashboard stays visible and the error shows as a banner.
  if (error && !summary) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Could not load your dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refreshDashboard}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <Empty className="m-6 border">
        <EmptyHeader>
          <EmptyTitle>No dashboard data</EmptyTitle>
          <EmptyDescription>Try refreshing the page.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const thisMonthNet =
    Number(summary.thisMonthIncome) - Number(summary.thisMonthExpenses);
  const { borrowedRemaining, lentRemaining } = summary;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Your money at a glance.
          </p>
          <AddTransactionDialog
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            categoriesError={categoriesError}
            onTransactionAdded={refreshDashboard}
            onCategoriesChanged={refreshCategories}
          />
        </div>

        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <FieldError>{error}</FieldError>
            <Button variant="outline" onClick={() => void refreshDashboard()}>
              Try again
            </Button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="This month's income"
            amount={signedMoney(summary.thisMonthIncome)}
            description="Income recorded this month"
            icon="income"
            tone="income"
          />

          <SummaryCard
            title="This month's expenses"
            amount={signedMoney(summary.thisMonthExpenses, "−")}
            description="Expenses recorded this month"
            icon="expenses"
            tone="expense"
          />

          <SummaryCard
            title="This month's balance"
            amount={signedMoney(thisMonthNet)}
            description="Income minus expenses this month"
            icon="balance"
            tone={thisMonthNet < 0 ? "negative" : "positive"}
          >
            <p className="mt-3 text-sm text-muted-foreground">
              Loan repayments paid: {formatMoney(summary.loanRepaidThisMonth)}
            </p>
            <p className="text-sm text-muted-foreground">
              Loan repayments received: {formatMoney(summary.loanReceivedThisMonth)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Loan payments are shown separately; they are not transactions.
            </p>
          </SummaryCard>
        </section>

        <p className="text-sm text-muted-foreground">
          All time · Income{" "}
          <span className="font-medium text-green-600 dark:text-green-400">
            +{formatMoney(summary.totalIncome)}
          </span>{" "}
          · Expenses{" "}
          <span className="font-medium text-red-600 dark:text-red-400">
            −{formatMoney(summary.totalExpenses)}
          </span>
        </p>

        <Card size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-words text-2xl font-semibold tracking-tight tabular-nums">
              {signedMoney(summary.balance, "")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Income minus expenses, plus money you still hold from borrowing,
              minus money you lent out.
            </p>
            {borrowedRemaining !== undefined && (
              <p className="mt-3 text-sm text-muted-foreground">
                Borrowed outstanding: {formatMoney(borrowedRemaining)}
              </p>
            )}
            {lentRemaining !== undefined && (
              <p className="text-sm text-muted-foreground">
                Lent outstanding: {formatMoney(lentRemaining)}
              </p>
            )}
          </CardContent>
        </Card>

        <CategoryBreakdown
          breakdown={summary.categoryBreakdown}
          categories={categories}
          isLoadingCategories={isLoadingCategories}
          categoriesError={categoriesError}
          onTransactionAdded={refreshDashboard}
          onCategoriesChanged={refreshCategories}
        />

        <MonthlyOverview
          monthlyData={summary.monthlyTrend}
          dailyTrend={summary.dailyTrend}
        />
      </div>
    </div>
  );
}
