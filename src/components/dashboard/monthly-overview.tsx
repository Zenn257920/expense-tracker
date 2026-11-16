"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTrendPoint } from "@/types/dashboard";
import { formatMoney } from "@/lib/format";

interface MonthlyOverviewProps {
  data: MonthlyTrendPoint[];
}

export default function MonthlyOverview({ data }: MonthlyOverviewProps) {
  const chartData = data.map((item) => ({
    ...item,
    income: Number(item.income),
    expenses: Number(item.expenses),
  }));

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-lg shadow-black/10 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">
          Income vs. Expenses
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Monthly cash flow of the last six months
        </p>
      </div>

      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#27272a"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="month"
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
              formatter={(value) => formatMoney(Number(value))}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #3f3f46",
                backgroundColor: "#18181b",
                color: "#fff",
              }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#34d399"
              strokeWidth={2.5}
              fill="url(#incomeGradient)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#fb7185"
              strokeWidth={2.5}
              fill="url(#expenseGradient)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
