"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import CategoryBreakdown from "@/components/dashboard/category-breakdown";
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
        <div className="flex justify-end">
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
            <div className="mt-4 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                This month
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">
                    Income
                  </p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-green-600 tabular-nums dark:text-green-400">
                    {signedMoney(summary.thisMonthIncome)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">
                    Expenses
                  </p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-red-600 tabular-nums dark:text-red-400">
                    {signedMoney(summary.thisMonthExpenses, "−")}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">Net</p>
                  <p
                    className={`mt-0.5 break-words text-sm font-semibold tabular-nums ${
                      thisMonthNet < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {signedMoney(thisMonthNet)}
                  </p>
                </div>
              </div>
            </div>
            {(borrowedRemaining !== undefined ||
              lentRemaining !== undefined) && (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Outstanding
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {borrowedRemaining !== undefined && (
                    <>Borrowed {formatMoney(borrowedRemaining)}</>
                  )}
                  {borrowedRemaining !== undefined &&
                    lentRemaining !== undefined &&
                    " · "}
                  {lentRemaining !== undefined && (
                    <>Lent {formatMoney(lentRemaining)}</>
                  )}
                </p>
              </div>
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
