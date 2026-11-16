import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { DEMO_USER_ID } from "@/lib/demo-user";
import { isValidAmount, isValidDate } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH: Update a transaction
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { categoryId, description, amount, transactionDate } = body;

    // Check that this transaction belongs to the user.
    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.id, id), eq(transactions.userId, DEMO_USER_ID)),
      )
      .limit(1);

    if (!existingTransaction) {
      return Response.json(
        { message: "Transaction not found" },
        { status: 404 },
      );
    }

    // Build only the fields the user wants to update.
    const updates: {
      categoryId?: string;
      description?: string;
      amount?: string;
      transactionDate?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (categoryId !== undefined) {
      if (typeof categoryId !== "string" || !categoryId) {
        return Response.json(
          { message: "Invalid category ID" },
          { status: 400 },
        );
      }

      const [category] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, categoryId),
            eq(categories.userId, DEMO_USER_ID),
          ),
        )
        .limit(1);

      if (!category) {
        return Response.json(
          { message: "Category not found" },
          { status: 404 },
        );
      }

      updates.categoryId = categoryId;
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        !description.trim() ||
        description.trim().length > 500
      ) {
        return Response.json(
          { message: "Description must be 1-500 characters" },
          { status: 400 },
        );
      }

      updates.description = description.trim();
    }

    if (amount !== undefined) {
      if (
        typeof amount !== "number" ||
        !isValidAmount(amount)
      ) {
        return Response.json(
          {
            message:
              "Amount must be positive and have no more than two decimal places",
          },
          { status: 400 },
        );
      }

      updates.amount = amount.toFixed(2);
    }

    if (transactionDate !== undefined) {
      if (
        typeof transactionDate !== "string" ||
        !isValidDate(transactionDate)
      ) {
        return Response.json(
          { message: "Invalid transaction date" },
          { status: 400 },
        );
      }

      updates.transactionDate = transactionDate;
    }

    if (Object.keys(updates).length === 1) {
      return Response.json(
        { message: "No fields provided to update" },
        { status: 400 },
      );
    }

    const [updatedTransaction] = await db
      .update(transactions)
      .set(updates)
      .where(
        and(eq(transactions.id, id), eq(transactions.userId, DEMO_USER_ID)),
      )
      .returning();

    return Response.json({
      success: true,
      message: "Transaction updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("PATCH transaction error:", error);

    return Response.json(
      { message: "Failed to update transaction" },
      { status: 500 },
    );
  }
}

// DELETE: Remove a transaction
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const [deletedTransaction] = await db
      .delete(transactions)
      .where(
        and(eq(transactions.id, id), eq(transactions.userId, DEMO_USER_ID)),
      )
      .returning();

    if (!deletedTransaction) {
      return Response.json(
        { message: "Transaction not found" },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      message: "Transaction deleted successfully",
      data: deletedTransaction,
    });
  } catch (error) {
    console.error("DELETE transaction error:", error);

    return Response.json(
      { message: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
