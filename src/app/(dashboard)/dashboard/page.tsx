"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import SummaryCard from "@/components/dashboard/summary-card";
import MonthlyOverview from "@/components/dashboard/monthly-overview";
import type { DashboardSummary, DashboardApiResponse } from "@/types/dashboard";
import { formatAmount } from "@/lib/format";
import { fetchGet } from "@/lib/client-fetch";

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
        const response = await fetchGet("/api/dashboard/summary");

        if (!response.ok) {
          throw new Error("Failed to load dashboard data.");
        }

        const result: DashboardApiResponse = await response.json();

        if (!result.success) {
          throw new Error("Could not retrieve dashboard summary.");
        }

        if (isActive) {
          setError(null);
          setSummary(result.data);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
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
      <div className="min-h-screen bg-zinc-950 p-6">
        <p className="text-red-400">{error}</p>

        <button
          onClick={() => {
            refreshDashboard();
          }}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="min-h-screen bg-zinc-950 p-6 text-zinc-400">
        No dashboard data.
      </p>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Total Balance"
            amount={formatAmount(summary.balance) + " MMK"}
            description="Your current balance"
            icon="balance"
            color="text-blue-300"
          />

          <SummaryCard
            title="Total Income"
            amount={formatAmount(summary.totalIncome) + " MMK"}
            description="Income recorded so far"
            icon="income"
            color="text-emerald-300"
          />

          <SummaryCard
            title="Total Expenses"
            amount={formatAmount(summary.totalExpenses) + " MMK"}
            description="Expenses recorded so far"
            icon="expenses"
            color="text-rose-300"
          />
        </section>

        <section>
          <MonthlyOverview data={summary.monthlyTrend} />
        </section>
      </div>
    </main>
  );
}
