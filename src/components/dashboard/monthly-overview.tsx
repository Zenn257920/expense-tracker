"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTrendPoint } from "@/types/dashboard";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface MonthlyOverviewProps {
  data: MonthlyTrendPoint[];
}

export default function MonthlyOverview({ data }: MonthlyOverviewProps) {
  const chartData = data.map((item) => ({
    ...item,
    income: Number(item.income),
    expenses: Number(item.expenses),
  }));

  const chartConfig = {
    income: { label: "Income", color: "var(--chart-2)" },
    expenses: { label: "Expenses", color: "var(--chart-5)" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs. Expenses</CardTitle>
        <CardDescription>Monthly cash flow of the last six months</CardDescription>
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

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => value.toLocaleString("en-US")}
              width={64}
            />
            <Tooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="var(--color-income)"
              strokeWidth={2}
              fill="url(#incomeGradient)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="var(--color-expenses)"
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
