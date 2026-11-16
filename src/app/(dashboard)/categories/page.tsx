"use client";

import { useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";

import type { Category } from "@/types/dashboard";
import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";

type CategoryType = Category["type"];

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    error: categoriesError,
    refreshCategories,
  } = useCategories();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      const result: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Could not create category.");
      }

      setName("");
      await refreshCategories();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Categories
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Organize income and expenses with categories.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Add a category</h2>
          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-4 sm:grid-cols-2 sm:items-end"
          >
            <div>
              <label
                htmlFor="category-name"
                className="mb-2 block text-sm text-zinc-300"
              >
                Name
              </label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Groceries"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label
                htmlFor="category-type"
                className="mb-2 block text-sm text-zinc-300"
              >
                Type
              </label>
              <select
                id="category-type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as CategoryType)
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-white outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="h-11 rounded-xl bg-zinc-800 px-4 text-white hover:bg-zinc-700 sm:col-span-2 sm:justify-self-end"
            >
              <Plus size={16} />
              {isSaving ? "Adding..." : "Add category"}
            </Button>
          </form>
          {saveError && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {saveError}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Your categories</h2>
            {!isLoading && (
              <span className="text-sm text-zinc-500">
                {categories.length} Total
              </span>
            )}
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              Loading categories...
            </p>
          ) : categoriesError ? (
            <p role="alert" className="py-10 text-center text-sm text-red-400">
              {categoriesError}
            </p>
          ) : categories.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              No categories yet. Add one above to get started.
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {categories.map((category) => {
                const isIncome = category.type === "income";
                const Icon = isIncome ? ArrowUpRight : ArrowDownLeft;

                return (
                  <li
                    key={category.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/60 p-4"
                  >
                    <span className="font-medium text-zinc-100">
                      {category.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        isIncome
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      <Icon size={14} />
                      {isIncome ? "Income" : "Expense"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
