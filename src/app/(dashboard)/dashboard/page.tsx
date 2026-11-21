"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import CategoryBreakdown from "@/components/dashboard/category-breakdown";
import SummaryCard from "@/components/dashboard/summary-card";
import MonthlyOverview from "@/components/dashboard/monthly-overview";
import AddTransactionDialog from "@/components/transactions/add-transaction-dialog";
import { useCategories } from "@/hooks/use-categories";
import type { DashboardSummary } from "@/types/dashboard";
import { formatAmount } from "@/lib/format";
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

  if (error) {
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Total Balance"
            amount={formatAmount(summary.balance) + " MMK"}
            description="Cash from transactions plus outstanding borrowed and lent amounts"
            icon="balance"
          />

          <SummaryCard
            title="Total Income"
            amount={formatAmount(summary.totalIncome) + " MMK"}
            description="Income recorded so far"
            icon="income"
          />

          <SummaryCard
            title="Total Expenses"
            amount={formatAmount(summary.totalExpenses) + " MMK"}
            description="Expenses recorded so far"
            icon="expenses"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="This month's income"
            amount={formatAmount(summary.thisMonthIncome) + " MMK"}
            description="Income recorded this month"
            icon="income"
          />

          <SummaryCard
            title="This month's expenses"
            amount={formatAmount(summary.thisMonthExpenses) + " MMK"}
            description="Expenses recorded this month"
            icon="expenses"
          />

          <Card>
            <CardHeader>
              <CardTitle>This month&apos;s balance</CardTitle>
              <CardDescription>
                Income minus expenses this month
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="text-2xl font-semibold tabular-nums">
                {formatAmount(thisMonthNet)} MMK
              </p>
              <p className="text-sm text-muted-foreground">
                Loan repayments paid: {formatAmount(summary.loanRepaidThisMonth)} MMK
              </p>
              <p className="text-sm text-muted-foreground">
                Loan repayments received: {formatAmount(summary.loanReceivedThisMonth)} MMK
              </p>
              <p className="text-xs text-muted-foreground">
                Loan payments are shown separately; they are not transactions.
              </p>
            </CardContent>
          </Card>
        </section>

        <CategoryBreakdown breakdown={summary.categoryBreakdown} />

        <MonthlyOverview
          monthlyData={summary.monthlyTrend}
          dailyTrend={summary.dailyTrend}
        />
      </div>
    </div>
  );
}
