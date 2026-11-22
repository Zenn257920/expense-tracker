"use client";

import { useState, type FormEvent } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
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
import { Spinner } from "@/components/ui/spinner";
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
import type { Category, RecentTransaction, TransactionType } from "@/types/dashboard";

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  categories: Category[];
  onTransactionChanged: () => void | Promise<void>;
}

/** "2026-11-22" -> "22 Nov 2026". Shared with the add-form voice review. */
export function formatTransactionDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function amountClassName(type: TransactionType) {
  return type === "income"
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

function signedAmount(transaction: RecentTransaction) {
  return `${transaction.type === "income" ? "+ " : "- "}${formatAmount(transaction.amount)} MMK`;
}

/** "1,250,000" -> 1250000; also tolerates spaces. */
function parseAmountInput(value: string) {
  return Number(value.replaceAll(/[,\s]/g, ""));
}

function focusField(id: string) {
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (element instanceof HTMLInputElement) element.focus({ preventScroll: true });
}

type EditFieldErrors = {
  category?: string;
  amount?: string;
  date?: string;
};

interface EditTransactionDialogProps {
  transaction: RecentTransaction;
  categories: Category[];
  onClose: () => void;
  onTransactionChanged: () => void | Promise<void>;
}

/**
 * Editing lives in a dialog, not in the table row — the table is 640px
 * wide, so an inline edit form sat off-screen on a phone. The dialog
 * reuses the add form's field order and validation.
 */
function EditTransactionDialog({
  transaction,
  categories,
  onClose,
  onTransactionChanged,
}: EditTransactionDialogProps) {
  const [editType, setEditType] = useState<TransactionType>(transaction.type);
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(formatAmount(transaction.amount));
  const [transactionDate, setTransactionDate] = useState(
    transaction.transactionDate,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<EditFieldErrors>({});

  const filteredCategories = categories.filter(
    (category) => category.type === editType,
  );
  const categoryItems = filteredCategories.map((category) => ({
    label: category.name,
    value: category.id,
  }));

  function clearFieldError(field: keyof EditFieldErrors) {
    setFieldErrors((prev) =>
      prev[field] ? { ...prev, [field]: undefined } : prev,
    );
  }

  function handleTypeChange(newType: TransactionType) {
    setEditType(newType);
    setCategoryId("");
  }

  function handleAmountChange(value: string) {
    setAmount(value.replaceAll(/[^0-9.,\s]/g, ""));
    clearFieldError("amount");
  }

  function handleAmountFocus() {
    setAmount((prev) => prev.replaceAll(/[,\s]/g, ""));
  }

  function handleAmountBlur() {
    const numeric = parseAmountInput(amount);
    if (amount.trim() && Number.isFinite(numeric) && numeric > 0) {
      setAmount(formatAmount(numeric));
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const nextErrors: EditFieldErrors = {};
    if (!categoryId) nextErrors.category = "Category ရွေးပေးပါ";
    const numericAmount = parseAmountInput(amount);
    if (!isValidAmount(numericAmount)) {
      nextErrors.amount = "ငွေပမာဏ ရိုက်ထည့်ပါ";
    }
    if (!transactionDate) nextErrors.date = "Date ရွေးပေးပါ";
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      if (nextErrors.category) focusField("edit-category");
      else if (nextErrors.amount) focusField("edit-amount");
      else focusField("edit-date");
      return;
    }

    setIsSaving(true);
    try {
      await api.updateTransaction(transaction.id, {
        categoryId,
        // Empty description is fine — the server defaults it to the
        // category name.
        description: description.trim(),
        amount: numericAmount,
        transactionDate,
      });
      toast.success("Transaction updated successfully.");
      onClose();
      await onTransactionChanged();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update transaction."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>Update the transaction details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="flex flex-col gap-5">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel>Transaction type</FieldLabel>
              <div
                role="group"
                aria-label="Transaction type"
                className="flex gap-2"
              >
                <Button
                  type="button"
                  variant={editType === "expense" ? "default" : "outline"}
                  aria-pressed={editType === "expense"}
                  className={
                    editType === "expense"
                      ? "min-h-11 flex-1 bg-red-500 hover:bg-red-400"
                      : "min-h-11 flex-1 bg-transparent text-muted-foreground"
                  }
                  onClick={() => handleTypeChange("expense")}
                >
                  {editType === "expense" && <Check data-icon="inline-start" />}
                  Expense
                </Button>
                <Button
                  type="button"
                  variant={editType === "income" ? "default" : "outline"}
                  aria-pressed={editType === "income"}
                  className={
                    editType === "income"
                      ? "min-h-11 flex-1 bg-green-500 hover:bg-green-600"
                      : "min-h-11 flex-1 bg-transparent text-muted-foreground"
                  }
                  onClick={() => handleTypeChange("income")}
                >
                  {editType === "income" && <Check data-icon="inline-start" />}
                  Income
                </Button>
              </div>
            </Field>

            <Field data-invalid={Boolean(fieldErrors.amount)}>
              <FieldLabel htmlFor="edit-amount">Amount (MMK)</FieldLabel>
              <Input
                id="edit-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                onFocus={handleAmountFocus}
                onBlur={handleAmountBlur}
                placeholder="e.g. 5,000"
              />
              {fieldErrors.amount && (
                <FieldError>{fieldErrors.amount}</FieldError>
              )}
            </Field>

            <Field data-invalid={Boolean(fieldErrors.category)}>
              <FieldLabel htmlFor="edit-category">Category</FieldLabel>
              <Select
                items={categoryItems}
                value={categoryId || null}
                onValueChange={(value) => {
                  setCategoryId(value ?? "");
                  clearFieldError("category");
                }}
              >
                <SelectTrigger id="edit-category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categoryItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldErrors.category && (
                <FieldError>{fieldErrors.category}</FieldError>
              )}
              {filteredCategories.length === 0 && (
                <FieldDescription>
                  No {editType} categories found. Create a category first.
                </FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-description">Description</FieldLabel>
              <Input
                id="edit-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. Lunch, Salary, Shopping"
                maxLength={500}
              />
              <FieldDescription>
                Optional — defaults to the category name.
              </FieldDescription>
            </Field>

            <Field data-invalid={Boolean(fieldErrors.date)}>
              <FieldLabel htmlFor="edit-date">Date</FieldLabel>
              <Input
                id="edit-date"
                type="date"
                value={transactionDate}
                onChange={(event) => {
                  setTransactionDate(event.target.value);
                  clearFieldError("date");
                }}
                required
              />
              {fieldErrors.date && <FieldError>{fieldErrors.date}</FieldError>}
            </Field>
          </FieldGroup>

          {error && <FieldError>{error}</FieldError>}
          <div className="sticky bottom-0 -mx-4 -mb-4 flex gap-2 border-t bg-popover px-4 pt-3 pb-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="zinc"
              className="flex-1"
              disabled={isSaving}
            >
              {isSaving && <Spinner data-icon="inline-start" />}
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RecentTransactions({
  transactions,
  categories,
  onTransactionChanged,
}: RecentTransactionsProps) {
  const [editing, setEditing] = useState<RecentTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecentTransaction | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

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
          <>
            {/* Mobile: stacked cards — the table's amount and actions sat
                off-screen at 390px, so phones get cards instead. */}
            <div className="flex flex-col gap-3 sm:hidden">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">
                        {transaction.description}
                      </p>
                      <Badge variant="outline" className="shrink-0">
                        {transaction.categoryName}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatTransactionDate(transaction.transactionDate)}
                      {" · "}
                      <span
                        className={`${amountClassName(transaction.type)} font-medium tabular-nums`}
                      >
                        {signedAmount(transaction)}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Edit transaction"
                      onClick={() => setEditing(transaction)}
                    >
                      <Pencil data-icon="inline-start" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      aria-label="Delete transaction"
                      onClick={() => setDeleteTarget(transaction)}
                    >
                      <Trash2 data-icon="inline-start" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* sm and up: table. */}
            <div className="hidden overflow-x-auto rounded-lg border sm:block">
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
                      <TableCell className="max-w-56 truncate font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.categoryName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTransactionDate(transaction.transactionDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <span className={amountClassName(transaction.type)}>
                          {signedAmount(transaction)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Edit transaction"
                            onClick={() => setEditing(transaction)}
                          >
                            <Pencil data-icon="inline-start" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            aria-label="Delete transaction"
                            onClick={() => setDeleteTarget(transaction)}
                          >
                            <Trash2 data-icon="inline-start" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      {editing && (
        <EditTransactionDialog
          key={editing.id}
          transaction={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onTransactionChanged={onTransactionChanged}
        />
      )}

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
