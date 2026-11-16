import { connection } from "next/server";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { DEMO_USER_ID } from "@/lib/demo-user";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function GET() {
  await connection();

  try {
    const result = await db
      .select({
        id: categories.id,
        name: categories.name,
        type: categories.type,
      })
      .from(categories)
      .where(eq(categories.userId, DEMO_USER_ID))
      .orderBy(asc(categories.type), asc(categories.name));

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("GET categories error:", error);

    return Response.json(
      { message: "Failed to retrieve categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, type } = body;

    if (!name || !type) {
      return Response.json(
        { message: "Name and type are required" },
        { status: 400 },
      );
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100
    ) {
      return Response.json(
        { message: "Category name must be between 1 and 100 characters" },
        { status: 400 },
      );
    }

    if (type !== "income" && type !== "expense") {
      return Response.json(
        { message: "Type must be income or expense" },
        { status: 400 },
      );
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        userId: DEMO_USER_ID,
        name: name.trim(),
        type,
      })
      .returning();

    return Response.json(
      {
        success: true,
        message: "Category created successfully",
        data: newCategory,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json(
        { message: "This category already exists for that type." },
        { status: 409 },
      );
    }

    console.error("POST categories error:", error);

    return Response.json(
      { message: "Failed to create category" },
      { status: 500 },
    );
  }
}
