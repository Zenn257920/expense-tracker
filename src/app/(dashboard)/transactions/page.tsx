"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import RecentTransactions from "@/components/transactions/recent-transactions";
import SearchBar from "@/components/ui/search-bar";
import type { RecentTransaction } from "@/types/dashboard";
import { useCategories } from "@/hooks/use-categories";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import TransactionsSkeleton from "@/components/transactions/transactions-skeleton";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TransactionType } from "@/types/dashboard";
import { TablePagination } from "@/components/ui/table-pagination";

const PAGE_SIZE = 5;
const FETCH_LIMIT = 100;
type TransactionTypeFilter = "all" | TransactionType;

export default function TransactionsPage() {
  const [allTransactions, setAllTransactions] = useState<RecentTransaction[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const { categories } = useCategories();

  useEffect(() => {
    let isActive = true;

    async function loadTransactions() {
      try {
        const firstPage = await api.getTransactions({
          page: 1,
          limit: FETCH_LIMIT,
          search: "",
          type: "all",
        });
        const remainingPages = await Promise.all(
          Array.from(
            { length: Math.max(0, firstPage.pagination.totalPages - 1) },
            (_, index) =>
              api.getTransactions({
                page: index + 2,
                limit: FETCH_LIMIT,
                search: "",
                type: "all",
              }),
          ),
        );

        if (isActive) {
          setError(null);
          setAllTransactions([
            ...firstPage.data,
            ...remainingPages.flatMap((result) => result.data),
          ]);
        }
      } catch (err) {
        if (isActive) {
          setError(getApiErrorMessage(err, "Could not load transactions."));
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadTransactions();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const matchingTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return allTransactions.filter(
      (transaction) =>
        (typeFilter === "all" || transaction.type === typeFilter) &&
        (!query ||
          transaction.description.toLocaleLowerCase().includes(query) ||
          transaction.categoryName.toLocaleLowerCase().includes(query)),
    );
  }, [allTransactions, search, typeFilter]);
  const totalTransactions = matchingTransactions.length;
  const totalPages = Math.ceil(totalTransactions / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const transactions = matchingTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const refreshTransactions = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }, []);

  if (isLoading) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage your transactions.
          </p>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/transactions/new" />}
          >
            <Plus data-icon="inline-start" />
            Add transaction
          </Button>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={typeFilter}
            onValueChange={(value) => {
              if (value && value !== typeFilter) {
                setError(null);
                setTypeFilter(value as TransactionTypeFilter);
                setPage(1);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>
          <SearchBar
            value={searchInput}
            placeholder="Search transactions..."
            hasSearch={Boolean(search)}
            onChange={setSearchInput}
            onSearch={(query) => {
              setError(null);
              setSearch(query);
              setPage(1);
            }}
            onReset={() => {
              setSearchInput("");
              setError(null);
              setSearch("");
              setPage(1);
            }}
          />
        </div>

        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <FieldError>{error}</FieldError>
            <Button
              variant="outline"
              onClick={() => void refreshTransactions()}
            >
              Try again
            </Button>
          </div>
        )}

        {!error && (
          <section className="space-y-4">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">
                Loading transactions...
              </div>
            ) : (
              <RecentTransactions
                transactions={transactions}
                categories={categories}
                onTransactionChanged={refreshTransactions}
              />
            )}
          </section>
        )}

        {!isLoading && !error && totalTransactions > 0 && (
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={totalTransactions}
            pageSize={PAGE_SIZE}
            itemLabel="transactions"
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
