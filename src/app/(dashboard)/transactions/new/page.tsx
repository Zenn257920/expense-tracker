"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import AddTransactionForm from "@/components/transactions/add-transaction-form";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";

export default function NewTransactionPage() {
  const router = useRouter();
  const { categories, isLoading, error } = useCategories();

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Button variant="ghost" nativeButton={false} render={<Link href="/transactions" />} className="self-start">
          <ArrowLeft data-icon="inline-start" />Back to transactions
        </Button>
        <AddTransactionForm
          categories={categories}
          isLoadingCategories={isLoading}
          categoriesError={error}
          onTransactionAdded={() => router.push("/transactions")}
        />
      </div>
    </div>
  );
}
