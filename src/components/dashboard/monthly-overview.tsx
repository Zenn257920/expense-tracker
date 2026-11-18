"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTrendPoint } from "@/types/dashboard";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DailyTrendPoint } from "@/types/dashboard";

interface MonthlyOverviewProps {
  monthlyData: MonthlyTrendPoint[];
  dailyTrend: DailyTrendPoint[];
}

type ChartPeriod = "current-month" | "last-six-months";
interface ChartPoint {
  date?: string;
  month?: string;
  income?: number;
  expenses: number;
}

export default function MonthlyOverview({ monthlyData, dailyTrend }: MonthlyOverviewProps) {
  const [period, setPeriod] = useState<ChartPeriod>("current-month");
  const isCurrentMonth = period === "current-month";
  const chartData: ChartPoint[] = isCurrentMonth
    ? dailyTrend.map((item) => ({
        date: item.date,
        income: Number(item.income),
        expenses: Number(item.expenses),
      }))
    : monthlyData.map((item) => ({
        month: item.month,
        income: Number(item.income),
        expenses: Number(item.expenses),
      }));

  const chartConfig = {
    income: { label: "Income", color: "#10b981" },
    expenses: { label: "Expenses", color: "#f43f5e" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>{isCurrentMonth ? "Daily Income vs. Expenses" : "Income vs. Expenses"}</CardTitle>
          <CardDescription>
            {isCurrentMonth ? "Income and expenses by day for the current month" : "Monthly cash flow of the last six months"}
          </CardDescription>
        </div>
        <Tabs value={period} onValueChange={(value) => value && setPeriod(value as ChartPeriod)}>
          <TabsList aria-label="Chart period">
            <TabsTrigger value="current-month">Current Month</TabsTrigger>
            <TabsTrigger value="last-six-months">Last 6 Months</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full sm:h-80">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="#3f3f46" strokeDasharray="3 3" />
            <XAxis
              dataKey={isCurrentMonth ? "date" : "month"}
              tickFormatter={isCurrentMonth ? (value: string) => formatDate(value) : undefined}
              interval={isCurrentMonth ? Math.max(0, Math.ceil(dailyTrend.length / 7) - 1) : 0}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickFormatter={(value: number) => value.toLocaleString("en-US")}
              width={64}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  labelFormatter={isCurrentMonth ? (value) => formatDate(String(value)) : undefined}
                  formatter={(value) => formatMoney(Number(value))}
                />
              }
            />
            <ChartLegend
              verticalAlign="top"
              height={36}
              content={<ChartLegendContent verticalAlign="top" />}
            />
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#incomeGradient)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              fillOpacity={1}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
