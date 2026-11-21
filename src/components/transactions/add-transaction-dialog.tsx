"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import AddTransactionForm from "@/components/transactions/add-transaction-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Category } from "@/types/dashboard";

interface AddTransactionDialogProps {
  categories: Category[];
  isLoadingCategories: boolean;
  categoriesError: string | null;
  onTransactionAdded: () => void | Promise<void>;
  onCategoriesChanged?: () => void | Promise<void>;
}

export default function AddTransactionDialog({
  categories,
  isLoadingCategories,
  categoriesError,
  onTransactionAdded,
  onCategoriesChanged,
}: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  async function handleTransactionAdded() {
    await onTransactionAdded();
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            <Plus data-icon="inline-start" />
            Add transaction
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Record your income or expenses.
          </DialogDescription>
        </DialogHeader>
        <AddTransactionForm
          categories={categories}
          isLoadingCategories={isLoadingCategories}
          categoriesError={categoriesError}
          onTransactionAdded={handleTransactionAdded}
          onCategoriesChanged={onCategoriesChanged}
        />
      </DialogContent>
    </Dialog>
  );
}
