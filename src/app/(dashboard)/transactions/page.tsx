"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import RecentTransactions from "@/components/transactions/recent-transactions";
import SearchBar from "@/components/ui/search-bar";
import type { RecentTransaction } from "@/types/dashboard";
import { useCategories } from "@/hooks/use-categories";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import TransactionsSkeleton from "@/components/transactions/transactions-skeleton";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

const LIMIT = 10;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const { categories } = useCategories();

  useEffect(() => {
    let isActive = true;

    async function loadTransactions() {
      try {
        const result = await api.getTransactions({
          page,
          limit: LIMIT,
          search,
        });

        if (isActive) {
          setError(null);
          setTransactions(result.data);
          setTotalPages(result.pagination.totalPages);
          setTotalTransactions(result.pagination.total);
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
  }, [page, refreshKey, search]);

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

        <SearchBar
          value={searchInput}
          placeholder="Search transactions..."
          hasSearch={Boolean(search)}
          onChange={setSearchInput}
          onSearch={(query) => {
            if (query !== search || page !== 1) {
              setIsLoading(true);
              setError(null);
            }
            setSearch(query);
            setPage(1);
          }}
          onReset={() => {
            setSearchInput("");
            if (search || page !== 1) {
              setIsLoading(true);
              setError(null);
            }
            setSearch("");
            setPage(1);
          }}
        />

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
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => {
                  setIsLoading(true);
                  setPage((prev) => prev - 1);
                }}
                aria-label="Previous page"
              >
                <ChevronLeft data-icon="inline-start" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => {
                  setIsLoading(true);
                  setPage((prev) => prev + 1);
                }}
                aria-label="Next page"
              >
                <ChevronRight data-icon="inline-start" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
