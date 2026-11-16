"use client";

import { useState, type FormEvent } from "react";

import type { Category } from "@/types/dashboard";
import Input from "@/components/ui/input";
import { isValidAmount } from "@/lib/validation";

interface AddTransactionFormProps {
  categories: Category[];
  isLoadingCategories: boolean;
  categoriesError: string | null;
  onTransactionAdded: () => void | Promise<void>;
}

type TransactionType = Category["type"];

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AddTransactionForm({
  categories,
  isLoadingCategories,
  categoriesError,
  onTransactionAdded,
}: AddTransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );
  const formError = error || categoriesError;

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    setCategoryId("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    const numericAmount = Number(amount);

    if (!isValidAmount(numericAmount)) {
      setError("Enter a positive amount with no more than two decimal places.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          description: description.trim(),
          amount: numericAmount,
          transactionDate,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to create transaction.");
      }

      setSuccess("Transaction added successfully!");

      // Reset the form after successful submission.
      setDescription("");
      setAmount("");
      setCategoryId("");
      setTransactionDate(getTodayDate());

      // Ask the dashboard to fetch its latest data.
      await onTransactionAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-lg font-semibold text-white">Add Transaction</h2>

      <p className="mt-1 text-sm text-zinc-400">
        Record your income or expenses.
      </p>

      <form
        onSubmit={handleSubmit}
        onFocusCapture={() => {
          setTransactionDate((date) => date || getTodayDate());
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label className="mb-2 block text-sm text-zinc-300">
            Transaction Type
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`rounded-lg border px-4 py-2 text-sm ${
                type === "expense"
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Expense
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              className={`rounded-lg border px-4 py-2 text-sm ${
                type === "income"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="mb-2 block text-sm text-zinc-300"
          >
            Category
          </label>

          <select
            id="category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={isLoadingCategories}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="">
              {isLoadingCategories
                ? "Loading categories..."
                : "Select category"}
            </option>

            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {!isLoadingCategories && filteredCategories.length === 0 && (
            <p className="mt-2 text-xs text-amber-400">
              No {type} categories found. Create a category first.
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm text-zinc-300"
          >
            Description
          </label>

          <Input
            id="description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Lunch, Salary, Shopping"
            maxLength={500}
            required
            className="bg-zinc-950"
          />
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="mb-2 block text-sm text-zinc-300">
            Amount (MMK)
          </label>

          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Enter amount"
            required
            className="bg-zinc-950"
          />
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="transactionDate"
            className="mb-2 block text-sm text-zinc-300"
          >
            Transaction Date
          </label>

          <Input
            id="transactionDate"
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            required
            className="bg-zinc-950"
          />
        </div>

        {/* Feedback */}
        {formError && (
          <p role="alert" className="text-sm text-red-400">
            {formError}
          </p>
        )}

        {success && (
          <p role="status" className="text-sm text-emerald-400">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={
            isSubmitting ||
            isLoadingCategories ||
            filteredCategories.length === 0
          }
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Add Transaction"}
        </button>
      </form>
    </section>
  );
}
