"use client";

import { useCallback, useEffect, useState } from "react";
import AddTransactionDialog from "@/components/transactions/add-transaction-dialog";
import RecentTransactions from "@/components/transactions/recent-transactions";
import SearchBar from "@/components/ui/search-bar";
import type { RecentTransaction } from "@/types/dashboard";
import { useCategories } from "@/hooks/use-categories";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import TransactionsSkeleton from "@/components/transactions/transactions-skeleton";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import Input from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TransactionType } from "@/types/dashboard";
import { TablePagination } from "@/components/ui/table-pagination";

function toCsvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const PAGE_SIZE = 5;
type TransactionTypeFilter = "all" | TransactionType;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
    refreshCategories,
  } = useCategories();

  const currentPage = Math.min(page, Math.max(1, totalPages));

  useEffect(() => {
    let isActive = true;

    async function loadTransactions() {
      try {
        const result = await api.getTransactions({
          page: currentPage,
          limit: PAGE_SIZE,
          search,
          type: typeFilter,
          categoryId: categoryId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (isActive) {
          setError(null);
          setTransactions(result.data);
          setTotalTransactions(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
        }
      } catch (err) {
        if (isActive) {
          setError(getApiErrorMessage(err, "Could not load transactions."));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
          setHasLoaded(true);
        }
      }
    }

    void loadTransactions();

    return () => {
      isActive = false;
    };
  }, [currentPage, refreshKey, search, typeFilter, categoryId, startDate, endDate]);

  const refreshTransactions = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }, []);

  const hasFilters = Boolean(categoryId || startDate || endDate);

  function applyFilterChange() {
    setError(null);
    setIsLoading(true);
    setPage(1);
  }

  function clearFilters() {
    setCategoryId("");
    setStartDate("");
    setEndDate("");
    applyFilterChange();
  }

  async function handleExportCsv() {
    setIsExporting(true);
    try {
      // The API caps a page at 100 rows, so page through all matches.
      const filters = {
        search,
        type: typeFilter,
        categoryId: categoryId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const first = await api.getTransactions({ ...filters, page: 1, limit: 100 });
      const all = [...first.data];
      const totalPages = first.pagination.totalPages;
      for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
        const result = await api.getTransactions({ ...filters, page: nextPage, limit: 100 });
        all.push(...result.data);
      }

      const header = ["Date", "Description", "Category", "Type", "Amount (MMK)"];
      const lines = all.map((transaction) =>
        [
          transaction.transactionDate,
          transaction.description,
          transaction.categoryName,
          transaction.type,
          transaction.amount,
        ].map(toCsvCell).join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not export transactions."));
    } finally {
      setIsExporting(false);
    }
  }

  const categoryOptions = categories.filter(
    (category) => typeFilter === "all" || category.type === typeFilter,
  );

  // Full skeleton only on the very first load. Later refreshes (add/edit/
  // delete, search, tab change) keep the list visible instead of flashing
  // the whole page white; the list shows its own loading state.
  if (isLoading && !hasLoaded) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage your transactions.
          </p>
          <AddTransactionDialog
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            categoriesError={categoriesError}
            onTransactionAdded={refreshTransactions}
            onCategoriesChanged={refreshCategories}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={typeFilter}
            onValueChange={(value) => {
              if (value && value !== typeFilter) {
                setError(null);
                setIsLoading(true);
                setTypeFilter(value as TransactionTypeFilter);
                // The chosen category may not exist for the new type.
                setCategoryId("");
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
              setIsLoading(true);
              setSearch(query);
              setPage(1);
            }}
            onReset={() => {
              setSearchInput("");
              setError(null);
              setIsLoading(true);
              setSearch("");
              setPage(1);
            }}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="sm:min-w-48">
            <FieldLabel htmlFor="filter-category">Category</FieldLabel>
            <Select
              items={[
                { label: "All categories", value: "all" },
                ...categoryOptions.map((category) => ({
                  label: category.name,
                  value: category.id,
                })),
              ]}
              value={categoryId || "all"}
              onValueChange={(value) => {
                setCategoryId(value === "all" ? "" : (value ?? ""));
                applyFilterChange();
              }}
            >
              <SelectTrigger id="filter-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="filter-start-date">From</FieldLabel>
            <Input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                applyFilterChange();
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="filter-end-date">To</FieldLabel>
            <Input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                applyFilterChange();
              }}
            />
          </Field>
          <div className="flex gap-2">
            {hasFilters && (
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={isExporting || totalTransactions === 0}
              onClick={handleExportCsv}
            >
              {isExporting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download data-icon="inline-start" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
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
            onPageChange={(nextPage) => {
              setIsLoading(true);
              setPage(nextPage);
            }}
          />
        )}
      </div>
    </div>
  );
}
