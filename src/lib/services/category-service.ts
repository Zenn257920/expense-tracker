import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import type { TransactionType } from "@/types/dashboard";

/**
 * Create the starter categories for a user. Safe to call repeatedly:
 * existing (user, name, type) rows are skipped, so it never duplicates
 * and never fails a signup if the categories already exist.
 */
export async function ensureDefaultCategories(userId: string) {
  await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((category) => ({ userId, ...category })),
    )
    .onConflictDoNothing();
}

type CategoryInput = Record<string, unknown>;

function isDatabaseError(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function validateCategory(input: CategoryInput) {
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 100) {
    throw new ApiError("Category name must be between 1 and 100 characters", 400);
  }
  if (input.type !== "income" && input.type !== "expense") {
    throw new ApiError("Type must be income or expense", 400);
  }

  return { name: input.name.trim(), type: input.type as TransactionType };
}

export async function listCategories(userId: string) {
  return db
    .select({ id: categories.id, name: categories.name, type: categories.type })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.type), asc(categories.name));
}

export async function createCategory(userId: string, input: CategoryInput) {
  const values = validateCategory(input);
  try {
    const [category] = await db.insert(categories).values({ userId, ...values }).returning();
    return category;
  } catch (error) {
    if (isDatabaseError(error, "23505")) {
      throw new ApiError("This category already exists for that type.", 409);
    }
    throw error;
  }
}

export async function updateCategory(userId: string, id: string, input: CategoryInput) {
  const updates: { name?: string; type?: TransactionType } = {};

  if (input.name !== undefined) {
    if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 100) {
      throw new ApiError("Category name must be between 1 and 100 characters", 400);
    }
    updates.name = input.name.trim();
  }

  if (input.type !== undefined) {
    if (input.type !== "income" && input.type !== "expense") {
      throw new ApiError("Type must be income or expense", 400);
    }
    updates.type = input.type;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError("No fields provided to update", 400);
  }

  try {
    const [category] = await db.update(categories).set(updates)
      .where(and(eq(categories.id, id), eq(categories.userId, userId))).returning();
    if (!category) throw new ApiError("Category not found", 404);
    return category;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isDatabaseError(error, "23505")) {
      throw new ApiError("This category already exists for that type.", 409);
    }
    throw error;
  }
}

export async function deleteCategory(userId: string, id: string) {
  try {
    const [categoryExists] = await db.select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .limit(1);

    if (!categoryExists) throw new ApiError("Category not found", 404);

    const [linkedTransaction] = await db.select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.categoryId, id))
      .limit(1);

    if (linkedTransaction) {
      throw new ApiError("This category has transactions and cannot be deleted.", 409);
    }

    const [category] = await db.delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId))).returning();
    if (!category) throw new ApiError("Category not found", 404);
    return category;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isDatabaseError(error, "23503")) {
      throw new ApiError("This category has transactions and cannot be deleted.", 409);
    }
    throw error;
  }
}
