import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { getAuthSession } from "@/lib/auth-session";
import { isValidAmount, isValidDate } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
    const body = await request.json();

    const { categoryId, description, amount, transactionDate } = body;

    if (
      !categoryId ||
      !description ||
      amount === undefined ||
      !transactionDate
    ) {
      return Response.json(
        { message: "All fields are required" },
        { status: 400 },
      );
    }

    if (
      typeof categoryId !== "string" ||
      typeof description !== "string" ||
      typeof amount !== "number" ||
      typeof transactionDate !== "string"
    ) {
      return Response.json({ message: "Invalid input data" }, { status: 400 });
    }

    if (!description.trim() || description.length > 500) {
      return Response.json(
        { message: "Description must be 1-500 characters" },
        { status: 400 },
      );
    }

    if (!isValidAmount(amount)) {
      return Response.json(
        {
          message:
            "Amount must be positive and have no more than two decimal places",
        },
        { status: 400 },
      );
    }

    if (!isValidDate(transactionDate)) {
      return Response.json(
        { message: "Invalid transaction date" },
        { status: 400 },
      );
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!category) {
      return Response.json({ message: "Category not found" }, { status: 404 });
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        categoryId,
        description: description.trim(),
        amount: amount.toFixed(2),
        transactionDate,
      })
      .returning();

    return Response.json(
      {
        success: true,
        message: "Transaction created successfully",
        data: newTransaction,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST transactions error:", error);

    return Response.json(
      { message: "Failed to create transaction" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
    const searchParams = new URL(request.url).searchParams;

    const categoryId = searchParams.get("categoryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim() || "";

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10) || 10),
    );

    if (
      (startDate && !isValidDate(startDate)) ||
      (endDate && !isValidDate(endDate)) ||
      (startDate && endDate && startDate > endDate)
    ) {
      return Response.json({ message: "Invalid date range" }, { status: 400 });
    }

    const filters = [eq(transactions.userId, session.user.id)];

    if (categoryId) {
      filters.push(eq(transactions.categoryId, categoryId));
    }

    if (startDate) {
      filters.push(gte(transactions.transactionDate, startDate));
    }

    if (endDate) {
      filters.push(lte(transactions.transactionDate, endDate));
    }

    if (search) {
      const searchFilter = or(
        ilike(transactions.description, `%${search}%`),
        ilike(categories.name, `%${search}%`),
      );

      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({
        total: count(),
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...filters));

    const total = Number(countResult.total);
    const totalPages = Math.ceil(total / limit);

    const result = await db
      .select({
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
      .orderBy(
        desc(transactions.transactionDate),
        desc(transactions.createdAt),
      )
      .limit(limit)
      .offset(offset);

    // 8. Return response
    return Response.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET transactions error:", error);

    return Response.json(
      { message: "Failed to retrieve transactions" },
      { status: 500 },
    );
  }
}
