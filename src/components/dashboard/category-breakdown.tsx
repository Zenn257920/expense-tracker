"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import AddTransactionDialog from "@/components/transactions/add-transaction-dialog";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, CategoryBreakdownPoint, TransactionType } from "@/types/dashboard";

interface CategoryBreakdownProps {
  breakdown: CategoryBreakdownPoint[];
  categories: Category[];
  isLoadingCategories: boolean;
  categoriesError: string | null;
  onTransactionAdded: () => void | Promise<void>;
  onCategoriesChanged?: () => void | Promise<void>;
}

export default function CategoryBreakdown({
  breakdown,
  categories,
  isLoadingCategories,
  categoriesError,
  onTransactionAdded,
  onCategoriesChanged,
}: CategoryBreakdownProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const items = breakdown.filter((item) => item.type === type);
  const typeTotal = items.reduce((sum, item) => sum + Number(item.total), 0);
  const Icon = type === "income" ? ArrowUpRight : ArrowDownLeft;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>
            {type === "income" ? "Income by category" : "Spending by category"}
          </CardTitle>
          <CardDescription>
            {type === "income"
              ? "Where your money came from this month, by category."
              : "Where your money went this month, by category."}
          </CardDescription>
        </div>
        <Tabs
          value={type}
          onValueChange={(value) => value && setType(value as TransactionType)}
        >
          <TabsList>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>
                No {type === "income" ? "income" : "expenses"} this month
              </EmptyTitle>
              <EmptyDescription>
                Add a transaction and it will show up here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <AddTransactionDialog
                categories={categories}
                isLoadingCategories={isLoadingCategories}
                categoriesError={categoriesError}
                onTransactionAdded={onTransactionAdded}
                onCategoriesChanged={onCategoriesChanged}
              />
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((item) => {
              const amount = Number(item.total);
              const percent = typeTotal > 0 ? Math.round((amount / typeTotal) * 100) : 0;
              return (
                <li key={`${item.type}-${item.categoryName}`} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-4" />
                      </span>
                      <span className="truncate">{item.categoryName}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatMoney(item.total)}
                      <span className="ml-2 text-muted-foreground">{percent}%</span>
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.categoryName}: ${percent}% of ${type} this month`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
