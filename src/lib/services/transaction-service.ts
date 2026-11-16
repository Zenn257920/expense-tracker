import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { isValidAmount, isValidDate } from "@/lib/validation";

type TransactionInput = {
  categoryId?: unknown;
  description?: unknown;
  amount?: unknown;
  transactionDate?: unknown;
};

export interface TransactionFilters {
  categoryId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string;
  page?: string | null;
  limit?: string | null;
}

function validateTransaction(input: TransactionInput) {
  const { categoryId, description, amount, transactionDate } = input;

  if (!categoryId || !description || amount === undefined || !transactionDate) {
    throw new ApiError("All fields are required", 400);
  }
  if (typeof categoryId !== "string" || typeof description !== "string" ||
      typeof amount !== "number" || typeof transactionDate !== "string") {
    throw new ApiError("Invalid input data", 400);
  }
  if (!description.trim() || description.length > 500) {
    throw new ApiError("Description must be 1-500 characters", 400);
  }
  if (!isValidAmount(amount)) {
    throw new ApiError("Amount must be positive and have no more than two decimal places", 400);
  }
  if (!isValidDate(transactionDate)) {
    throw new ApiError("Invalid transaction date", 400);
  }

  return { categoryId, description: description.trim(), amount, transactionDate };
}

export async function listTransactions(userId: string, options: TransactionFilters = {}) {
  const { categoryId, startDate, endDate, search = "" } = options;
  const page = Math.max(1, Number.parseInt(options.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(options.limit ?? "10", 10) || 10));

  if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate)) ||
      (startDate && endDate && startDate > endDate)) {
    throw new ApiError("Invalid date range", 400);
  }

  const filters = [eq(transactions.userId, userId)];
  if (categoryId) filters.push(eq(transactions.categoryId, categoryId));
  if (startDate) filters.push(gte(transactions.transactionDate, startDate));
  if (endDate) filters.push(lte(transactions.transactionDate, endDate));

  if (search.trim()) {
    const searchFilter = or(
      ilike(transactions.description, `%${search.trim()}%`),
      ilike(categories.name, `%${search.trim()}%`),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  const [countResult, data] = await Promise.all([
    db.select({ total: count() })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...filters)),
    db.select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      transactionDate: transactions.transactionDate,
      categoryId: categories.id,
      categoryName: categories.name,
      type: categories.type,
    })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...filters))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  const total = Number(countResult[0].total);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createTransaction(userId: string, input: TransactionInput) {
  const values = validateTransaction(input);
  const [category] = await db.select({ id: categories.id }).from(categories)
    .where(and(eq(categories.id, values.categoryId), eq(categories.userId, userId))).limit(1);
  if (!category) throw new ApiError("Category not found", 404);

  const [transaction] = await db.insert(transactions).values({
    userId,
    categoryId: values.categoryId,
    description: values.description,
    amount: values.amount.toFixed(2),
    transactionDate: values.transactionDate,
  }).returning();
  return transaction;
}

export async function updateTransaction(userId: string, id: string, input: TransactionInput) {
  const updates: {
    categoryId?: string;
    description?: string;
    amount?: string;
    transactionDate?: string;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.categoryId !== undefined) {
    if (typeof input.categoryId !== "string" || !input.categoryId) {
      throw new ApiError("Invalid category ID", 400);
    }
    const [category] = await db.select({ id: categories.id }).from(categories)
      .where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId))).limit(1);
    if (!category) throw new ApiError("Category not found", 404);
    updates.categoryId = input.categoryId;
  }

  if (input.description !== undefined) {
    if (typeof input.description !== "string" || !input.description.trim() || input.description.trim().length > 500) {
      throw new ApiError("Description must be 1-500 characters", 400);
    }
    updates.description = input.description.trim();
  }

  if (input.amount !== undefined) {
    if (typeof input.amount !== "number" || !isValidAmount(input.amount)) {
      throw new ApiError("Amount must be positive and have no more than two decimal places", 400);
    }
    updates.amount = input.amount.toFixed(2);
  }

  if (input.transactionDate !== undefined) {
    if (typeof input.transactionDate !== "string" || !isValidDate(input.transactionDate)) {
      throw new ApiError("Invalid transaction date", 400);
    }
    updates.transactionDate = input.transactionDate;
  }

  if (Object.keys(updates).length === 1) throw new ApiError("No fields provided to update", 400);

  const [transaction] = await db.update(transactions).set(updates)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId))).returning();
  if (!transaction) throw new ApiError("Transaction not found", 404);
  return transaction;
}

export async function deleteTransaction(userId: string, id: string) {
  const [transaction] = await db.delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId))).returning();
  if (!transaction) throw new ApiError("Transaction not found", 404);
  return transaction;
}
