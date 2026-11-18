"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import SummaryCard from "@/components/dashboard/summary-card";
import MonthlyOverview from "@/components/dashboard/monthly-overview";
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
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        if (isActive) setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  if (isLoading) {
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

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:gap-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Total Balance"
            amount={formatAmount(summary.balance) + " MMK"}
            description="Your current balance"
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

        <MonthlyOverview
          monthlyData={summary.monthlyTrend}
          dailyTrend={summary.dailyTrend}
        />
      </div>
    </div>
  );
}
