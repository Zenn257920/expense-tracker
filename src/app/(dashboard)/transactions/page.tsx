"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import AddTransactionForm from "@/components/transactions/add-transaction-form";
import RecentTransactions from "@/components/transactions/recent-transactions";
import SearchBar from "@/components/ui/search-bar";
import type { RecentTransaction } from "@/types/dashboard";
import { useCategories } from "@/hooks/use-categories";

const LIMIT = 10;

interface TransactionsApiResponse {
  success: boolean;
  data: RecentTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
  const {
    categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useCategories();

  useEffect(() => {
    let isActive = true;

    async function loadTransactions() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(LIMIT),
          search,
        });

        const response = await fetch(`/api/transactions?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to load transactions.");
        }

        const result: TransactionsApiResponse = await response.json();

        if (!result.success) {
          throw new Error("Could not retrieve transactions.");
        }

        if (isActive) {
          setError(null);
          setTransactions(result.data);
          setTotalPages(result.pagination.totalPages);
          setTotalTransactions(result.pagination.total);
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

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Transactions
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Records of my transactions.
          </p>
        </header>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-white/10 bg-zinc-900 px-4 py-3.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800">
            <span className="flex items-center gap-2">
              <Plus size={18} className="text-blue-400" />
              Add a transaction
            </span>
            <span className="text-xs text-zinc-500 group-open:hidden">
              Show form
            </span>
            <span className="hidden text-xs text-zinc-500 group-open:inline">
              Hide form
            </span>
          </summary>
          <div className="mt-4">
            <AddTransactionForm
              categories={categories}
              isLoadingCategories={isLoadingCategories}
              categoriesError={categoriesError}
              onTransactionAdded={refreshTransactions}
            />
          </div>
        </details>

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
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-400">{error}</p>

            <button
              onClick={() => void refreshTransactions()}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
            >
              Try again
            </button>
          </div>
        )}

        {!error && (
          <section className="space-y-4">
            {isLoading ? (
              <div className="py-10 text-center text-zinc-400">
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
            <p className="text-sm text-zinc-400">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => {
                  setIsLoading(true);
                  setPage((prev) => prev - 1);
                }}
                aria-label="Previous page"
                className="rounded-lg border border-zinc-700 p-2 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => {
                  setIsLoading(true);
                  setPage((prev) => prev + 1);
                }}
                aria-label="Next page"
                className="rounded-lg border border-zinc-700 p-2 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
