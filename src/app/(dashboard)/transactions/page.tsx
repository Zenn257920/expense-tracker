"use client";

import { useCallback, useEffect, useState } from "react";
import AddTransactionDialog from "@/components/transactions/add-transaction-dialog";
import RecentTransactions from "@/components/transactions/recent-transactions";
import SearchBar from "@/components/ui/search-bar";
import type { RecentTransaction } from "@/types/dashboard";
import { useCategories } from "@/hooks/use-categories";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import TransactionsSkeleton from "@/components/transactions/transactions-skeleton";
import { Download, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
const DATE_DEBOUNCE_MS = 400;

type TransactionTypeFilter = "all" | TransactionType;

interface FilteredTotals {
  income: number;
  expense: number;
  count: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filteredTotals, setFilteredTotals] = useState<FilteredTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  // Live search: apply the typed query once the user stops typing, instead
  // of waiting for the Search button.
  useEffect(() => {
    const query = searchInput.trim();
    if (query === search) return;
    const timer = setTimeout(() => {
      setError(null);
      setIsLoading(true);
      setSearch(query);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // An inverted pair is an error and leaves the previous filter in place.
  const dateError =
    startDate && endDate && startDate > endDate
      ? "The From date must be on or before the To date."
      : null;

  // Date pair: only apply once the pair is complete and valid, debounced
  // so picking From and then To triggers a single refetch. A single bound
  // (From-only or To-only) applies on its own.
  useEffect(() => {
    if (dateError) return;
    if (startDate === appliedStartDate && endDate === appliedEndDate) return;
    const timer = setTimeout(() => {
      setAppliedStartDate(startDate);
      setAppliedEndDate(endDate);
      setIsLoading(true);
      setPage(1);
    }, DATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [startDate, endDate, appliedStartDate, appliedEndDate, dateError]);

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
          startDate: appliedStartDate || undefined,
          endDate: appliedEndDate || undefined,
        });

        if (isActive) {
          setError(null);
          setTransactions(result.data);
          setTotalTransactions(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
          setFilteredTotals(result.totals ?? null);
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
  }, [currentPage, refreshKey, search, typeFilter, categoryId, appliedStartDate, appliedEndDate]);

  const refreshTransactions = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }, []);

  const isFiltered = Boolean(
    search || typeFilter !== "all" || categoryId || appliedStartDate || appliedEndDate,
  );
  const activeFilterCount =
    (categoryId ? 1 : 0) + (appliedStartDate || appliedEndDate ? 1 : 0);

  function applyFilterChange() {
    setError(null);
    setIsLoading(true);
    setPage(1);
  }

  function clearAllFilters() {
    setCategoryId("");
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setSearchInput("");
    setSearch("");
    setTypeFilter("all");
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
        startDate: appliedStartDate || undefined,
        endDate: appliedEndDate || undefined,
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
            placeholder="Search description or category…"
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

        <div className="flex flex-col gap-3">
          <div
            className={`flex-col gap-3 sm:flex sm:flex-row sm:items-end ${
              filtersOpen ? "flex" : "hidden"
            }`}
          >
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
            <Field data-invalid={Boolean(dateError)}>
              <FieldLabel htmlFor="filter-start-date">From</FieldLabel>
              <Input
                id="filter-start-date"
                type="date"
                value={startDate}
                aria-invalid={Boolean(dateError)}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field data-invalid={Boolean(dateError)}>
              <FieldLabel htmlFor="filter-end-date">To</FieldLabel>
              <Input
                id="filter-end-date"
                type="date"
                value={endDate}
                aria-invalid={Boolean(dateError)}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </div>
          {dateError && <FieldError>{dateError}</FieldError>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="sm:hidden"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal data-icon="inline-start" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {isFiltered && (
              <Button type="button" variant="outline" onClick={clearAllFilters}>
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

        {isFiltered && filteredTotals && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filteredTotals.count}{" "}
            {filteredTotals.count === 1 ? "transaction" : "transactions"} ·{" "}
            Expenses {formatMoney(filteredTotals.expense)} · Income{" "}
            {formatMoney(filteredTotals.income)}
          </p>
        )}

        <section className="space-y-4">
          {transactions.length > 0 ? (
            <RecentTransactions
              transactions={transactions}
              categories={categories}
              onTransactionChanged={refreshTransactions}
            />
          ) : isLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              Loading transactions...
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No transactions to show. Try again to reload.
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>
                  {isFiltered
                    ? "No transactions match your filters"
                    : "No transactions yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {isFiltered
                    ? "Try different filters or add a transaction."
                    : "Add your first transaction to see it here."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex-row flex-wrap justify-center">
                <AddTransactionDialog
                  categories={categories}
                  isLoadingCategories={isLoadingCategories}
                  categoriesError={categoriesError}
                  onTransactionAdded={refreshTransactions}
                  onCategoriesChanged={refreshCategories}
                />
                {isFiltered && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearAllFilters}
                  >
                    Clear filters
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          )}
        </section>

        {totalTransactions > 0 && (
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
