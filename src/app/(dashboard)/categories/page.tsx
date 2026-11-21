"use client";

import { useState, type FormEvent } from "react";
import axios from "axios";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useCategories } from "@/hooks/use-categories";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { Category } from "@/types/dashboard";
import { Spinner } from "@/components/ui/spinner";
import { TablePagination } from "@/components/ui/table-pagination";

type CategoryType = Category["type"];
const typeItems = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
];
const CATEGORY_PAGE_SIZE = 5;

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    error: categoriesError,
    refreshCategories,
  } = useCategories();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryType>("expense");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const categoryTotalPages = Math.ceil(categories.length / CATEGORY_PAGE_SIZE);
  const currentCategoryPage = Math.min(categoryPage, Math.max(1, categoryTotalPages));
  const paginatedCategories = categories.slice(
    (currentCategoryPage - 1) * CATEGORY_PAGE_SIZE,
    currentCategoryPage * CATEGORY_PAGE_SIZE,
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await api.createCategory({ name, type });
      setName("");
      await refreshCategories();
      toast.success("Category added successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create category."));
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(category: Category) {
    setEditing(category);
    setEditName(category.name);
    setEditType(category.type);
    setError("");
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    setIsSaving(true);
    try {
      await api.updateCategory(editing.id, { name: editName, type: editType });
      setEditing(null);
      await refreshCategories();
      toast.success("Category updated successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update category."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddStarterCategories() {
    setError("");
    setIsSaving(true);
    try {
      // Existing accounts have no categories: create the starter set
      // one by one through the normal create endpoint (duplicates 409
      // and are skipped, so this is safe to tap more than once).
      for (const category of DEFAULT_CATEGORIES) {
        try {
          await api.createCategory(category);
        } catch (err) {
          // 409 = that category already exists; skip it and keep going.
          if (!(axios.isAxiosError(err) && err.response?.status === 409)) {
            throw err;
          }
        }
      }
      await refreshCategories();
      toast.success("Starter categories added.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not add starter categories."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setError("");
    setIsSaving(true);
    try {
      await api.deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      await refreshCategories();
      toast.success("Category deleted successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete category."));
      setDeleteTarget(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add a category</CardTitle>
            <CardDescription>
              Keep income and expenses organized.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreate}
              className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
            >
              <FieldGroup className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="category-name">Name</FieldLabel>
                  <Input
                    id="category-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Groceries"
                    maxLength={100}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category-type">Type</FieldLabel>
                  <Select
                    items={typeItems}
                    value={type}
                    onValueChange={(value) =>
                      value && setType(value as CategoryType)
                    }
                  >
                    <SelectTrigger id="category-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {typeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              <Button
                type="submit"
                variant="outline"
                size="lg"
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus data-icon="inline-start" />
                    Add category
                  </>
                )}
              </Button>
            </form>
            {error && <FieldError className="mt-4">{error}</FieldError>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your categories</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading categories..."
                : `${categories.length} categories`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesError ? (
              <FieldError>{categoriesError}</FieldError>
            ) : isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading categories...
              </p>
            ) : categories.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No categories yet</EmptyTitle>
                  <EmptyDescription>
                    Add a category above, or add the starter set
                    (Food, Transport, Bills, Salary and more) in one tap.
                  </EmptyDescription>
                </EmptyHeader>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isSaving}
                  onClick={handleAddStarterCategories}
                >
                  {isSaving ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus data-icon="inline-start" />
                      Add starter categories
                    </>
                  )}
                </Button>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-3">
                {paginatedCategories.map((category) => {
                  const Icon =
                    category.type === "income" ? ArrowUpRight : ArrowDownLeft;
                  const isIncome = category.type === "income";
                  return (
                    <li key={category.id}>
                      <Card size="sm">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3">
                          {editing?.id === category.id ? (
                            <form
                              onSubmit={handleUpdate}
                              className="grid w-full gap-3 sm:grid-cols-[1fr_12rem_auto_auto]"
                            >
                              <Field>
                                <FieldLabel htmlFor="edit-category-name">
                                  Name
                                </FieldLabel>
                                <Input
                                  id="edit-category-name"
                                  value={editName}
                                  onChange={(event) =>
                                    setEditName(event.target.value)
                                  }
                                  maxLength={100}
                                  required
                                />
                              </Field>
                              <Field>
                                <FieldLabel htmlFor="edit-category-type">
                                  Type
                                </FieldLabel>
                                <Select
                                  items={typeItems}
                                  value={editType}
                                  onValueChange={(value) =>
                                    value && setEditType(value as CategoryType)
                                  }
                                >
                                  <SelectTrigger
                                    id="edit-category-type"
                                    className="w-full"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      {typeItems.map((item) => (
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
                              <Button
                                type="submit"
                                size="lg"
                                disabled={isSaving}
                                className="self-end"
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => setEditing(null)}
                                className="self-end"
                              >
                                Cancel
                              </Button>
                            </form>
                          ) : (
                            <>
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                                  <Icon />
                                </span>
                                <span className="truncate font-medium">
                                  {category.name}
                                </span>
                                <Badge
                                  variant={isIncome ? "secondary" : "outline"}
                                >
                                  {isIncome ? "Income" : "Expense"}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditing(category)}
                                >
                                  <Pencil data-icon="inline-start" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteTarget(category)}
                                >
                                  <Trash2 data-icon="inline-start" />
                                  Delete
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
            {!categoriesError && !isLoading && categories.length > 0 && (
              <div className="mt-4">
                <TablePagination
                  page={currentCategoryPage}
                  totalPages={categoryTotalPages}
                  totalItems={categories.length}
                  pageSize={CATEGORY_PAGE_SIZE}
                  itemLabel="categories"
                  onPageChange={setCategoryPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will be removed. Categories with transactions cannot be deleted.`
                : "This category will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              variant="destructive"
            >
              {isSaving ? "Deleting..." : "Delete category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
