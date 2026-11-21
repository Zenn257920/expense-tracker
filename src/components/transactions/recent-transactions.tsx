"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import Input from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAmount } from "@/lib/format";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { isValidAmount } from "@/lib/validation";
import type { Category, RecentTransaction } from "@/types/dashboard";

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
  const [deleteTarget, setDeleteTarget] = useState<RecentTransaction | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
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

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    const numericAmount = Number(editForm.amount);
    if (!editForm.categoryId) return setError("Please select a category.");
    if (!isValidAmount(numericAmount))
      return setError(
        "Enter a positive amount with no more than two decimal places.",
      );

    setIsSaving(true);
    setError("");
    try {
      await api.updateTransaction(editingId, {
        ...editForm,
        description: editForm.description.trim(),
        amount: numericAmount,
      });
      setEditingId(null);
      toast.success("Transaction updated successfully.");
      await onTransactionChanged();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update transaction."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    setError("");
    try {
      await api.deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Transaction deleted successfully.");
      await onTransactionChanged();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete transaction."));
      setDeleteTarget(null);
    } finally {
      setIsSaving(false);
    }
  }

  const categoryItems = categories.map((category) => ({
    label: `${category.name} (${category.type})`,
    value: category.id,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>Your latest transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <FieldError className="mb-4">{error}</FieldError>}
        {transactions.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No transactions found</EmptyTitle>
              <EmptyDescription>
                Try another search or add your first transaction.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[640px]">
              <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  {editingId === transaction.id ? (
                    <TableCell colSpan={5} className="whitespace-normal">
                      <form
                        onSubmit={handleUpdate}
                        className="flex flex-col gap-4"
                      >
                        <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field>
                            <FieldLabel
                              htmlFor={`edit-description-${transaction.id}`}
                            >
                              Description
                            </FieldLabel>
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
                            />
                          </Field>
                          <Field>
                            <FieldLabel
                              htmlFor={`edit-category-${transaction.id}`}
                            >
                              Category
                            </FieldLabel>
                            <Select
                              items={categoryItems}
                              value={editForm.categoryId || null}
                              onValueChange={(value) =>
                                setEditForm({
                                  ...editForm,
                                  categoryId: value ?? "",
                                })
                              }
                            >
                              <SelectTrigger
                                id={`edit-category-${transaction.id}`}
                                className="w-full"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {categoryItems.map((item) => (
                                    <SelectItem
                                      key={item.value}
                                      value={item.value}
                                    >
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel
                              htmlFor={`edit-amount-${transaction.id}`}
                            >
                              Amount (MMK)
                            </FieldLabel>
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
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`edit-date-${transaction.id}`}>
                              Date
                            </FieldLabel>
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
                            />
                          </Field>
                        </FieldGroup>
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            disabled={isSaving}
                            variant="outline"
                          >
                            Save changes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isSaving}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="max-w-56 truncate font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.categoryName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(transaction.transactionDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <span
                          className={
                            transaction.type === "income"
                              ? "text-primary"
                              : "text-foreground"
                          }
                        >
                          {transaction.type === "income" ? "+ " : "- "}
                          {formatAmount(transaction.amount)} MMK
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Edit transaction"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Pencil data-icon="inline-start" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label="Delete transaction"
                            onClick={() => setDeleteTarget(transaction)}
                          >
                            <Trash2 data-icon="inline-start" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone
              {deleteTarget
                ? `. “${deleteTarget.description}” will be removed.`
                : "."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete transaction"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
