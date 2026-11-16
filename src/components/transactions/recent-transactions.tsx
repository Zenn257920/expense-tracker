"use client";

import { useState, type FormEvent } from "react";

import type { Category, RecentTransaction } from "@/types/dashboard";
import { formatAmount } from "@/lib/format";
import Input from "@/components/ui/input";
import { isValidAmount } from "@/lib/validation";

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  categories: Category[];
  onTransactionChanged: () => void | Promise<void>;
}

interface EditFormData {
  description: string;
  amount: string;
  categoryId: string;
  transactionDate: string;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RecentTransactions({
  transactions,
  categories,
  onTransactionChanged,
}: RecentTransactionsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    description: "",
    amount: "",
    categoryId: "",
    transactionDate: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleEdit(transaction: RecentTransaction) {
    setEditingId(transaction.id);
    setError("");

    setEditForm({
      description: transaction.description,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      transactionDate: transaction.transactionDate,
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setError("");
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId) return;

    if (!editForm.categoryId) {
      setError("Please select a category.");
      return;
    }

    const numericAmount = Number(editForm.amount);

    if (!isValidAmount(numericAmount)) {
      setError("Enter a positive amount with no more than two decimal places.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const response = await fetch(`/api/transactions/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: editForm.description.trim(),
          amount: numericAmount,
          categoryId: editForm.categoryId,
          transactionDate: editForm.transactionDate,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to update transaction.");
      }

      setEditingId(null);

      await onTransactionChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(transactionId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(transactionId);
      setError("");

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to delete transaction.");
      }

      await onTransactionChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      {transactions.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          No transactions yet.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-lg border border-zinc-800 p-4"
            >
              {editingId === transaction.id ? (
                <form onSubmit={handleUpdate} className="space-y-3">
                  <h3 className="font-medium text-white">Edit Transaction</h3>

                  <div>
                    <label
                      htmlFor={`edit-description-${transaction.id}`}
                      className="mb-1 block text-xs text-zinc-400"
                    >
                      Description
                    </label>
                    <Input
                      id={`edit-description-${transaction.id}`}
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          description: event.target.value,
                        })
                      }
                      maxLength={500}
                      required
                      className="bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`edit-category-${transaction.id}`}
                      className="mb-1 block text-xs text-zinc-400"
                    >
                      Category
                    </label>
                    <select
                      id={`edit-category-${transaction.id}`}
                      value={editForm.categoryId}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          categoryId: event.target.value,
                        })
                      }
                      required
                      disabled={categories.length === 0}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name} ({category.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`edit-amount-${transaction.id}`}
                      className="mb-1 block text-xs text-zinc-400"
                    >
                      Amount (MMK)
                    </label>
                    <Input
                      id={`edit-amount-${transaction.id}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          amount: event.target.value,
                        })
                      }
                      required
                      className="bg-zinc-950"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`edit-date-${transaction.id}`}
                      className="mb-1 block text-xs text-zinc-400"
                    >
                      Date
                    </label>
                    <Input
                      id={`edit-date-${transaction.id}`}
                      type="date"
                      value={editForm.transactionDate}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          transactionDate: event.target.value,
                        })
                      }
                      required
                      className="bg-zinc-950"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium text-white">
                      {transaction.description}
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">
                      {transaction.categoryName} ·{" "}
                      {formatDate(transaction.transactionDate)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`font-semibold ${
                        transaction.type === "income"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {transaction.type === "income" ? "+ " : "- "}
                      {formatAmount(transaction.amount)} MMK
                    </span>

                    <button
                      type="button"
                      onClick={() => handleEdit(transaction)}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(transaction.id)}
                      disabled={deletingId === transaction.id}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-950 disabled:opacity-50"
                    >
                      {deletingId === transaction.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
