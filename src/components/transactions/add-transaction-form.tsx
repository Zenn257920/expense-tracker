"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { isValidAmount } from "@/lib/validation";
import type { Category } from "@/types/dashboard";

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

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );
  const formError = error || categoriesError;
  const categoryItems = [
    { label: "Select a category", value: null },
    ...filteredCategories.map((category) => ({
      label: category.name,
      value: category.id,
    })),
  ];

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    setCategoryId("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

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
      await api.createTransaction({
        categoryId,
        description: description.trim(),
        amount: numericAmount,
        transactionDate,
      });

      setType("expense");
      setCategoryId("");
      setDescription("");
      setAmount("");
      setTransactionDate("");
      setError("");
      toast.success("Transaction added successfully.");
      await onTransactionAdded();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create transaction."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={() => setTransactionDate((date) => date || getTodayDate())}
      className="flex flex-col gap-5"
    >
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
              variant={type === "expense" ? "default" : "outline"}
              aria-pressed={type === "expense"}
              className="flex-1 bg-red-500 hover:bg-red-400"
              onClick={() => handleTypeChange("expense")}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              aria-pressed={type === "income"}
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={() => handleTypeChange("income")}
            >
              Income
            </Button>
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="category">Category</FieldLabel>
          <Select
            items={categoryItems}
            value={categoryId || null}
            onValueChange={(value) => setCategoryId(value ?? "")}
            disabled={isLoadingCategories}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categoryItems.map((item) => (
                  <SelectItem key={item.value ?? "empty"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {!isLoadingCategories && filteredCategories.length === 0 && (
            <FieldDescription>
              No {type} categories found. Create a category first.
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Lunch, Salary, Shopping"
            maxLength={500}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="amount">Amount (MMK)</FieldLabel>
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Enter amount"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="transactionDate">Transaction date</FieldLabel>
          <Input
            id="transactionDate"
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            required
          />
        </Field>
      </FieldGroup>

      {formError && <FieldError>{formError}</FieldError>}
      <Button
        type="submit"
        variant="zinc"
        disabled={
          isSubmitting ||
          isLoadingCategories ||
          filteredCategories.length === 0
        }
        className="w-full"
      >
        {isSubmitting && <Spinner data-icon="inline-start" />}
        {isSubmitting ? "Saving..." : "Add transaction"}
      </Button>
    </form>
  );
}
