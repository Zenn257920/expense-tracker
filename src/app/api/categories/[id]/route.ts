import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { getAuthSession } from "@/lib/auth-session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const updates: { name?: string; type?: "income" | "expense" } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
        return Response.json({ message: "Category name must be between 1 and 100 characters" }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.type !== undefined) {
      if (body.type !== "income" && body.type !== "expense") {
        return Response.json({ message: "Type must be income or expense" }, { status: 400 });
      }
      updates.type = body.type;
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ message: "No fields provided to update" }, { status: 400 });
    }

    const [category] = await db.update(categories).set(updates)
      .where(and(eq(categories.id, id), eq(categories.userId, session.user.id)))
      .returning();
    if (!category) return Response.json({ message: "Category not found" }, { status: 404 });
    return Response.json({ success: true, data: category });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ message: "This category already exists for that type." }, { status: 409 });
    }
    console.error("PATCH category error:", error);
    return Response.json({ message: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const [category] = await db.delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, session.user.id)))
      .returning();
    if (!category) return Response.json({ message: "Category not found" }, { status: 404 });
    return Response.json({ success: true, data: category });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
      return Response.json({ message: "This category has transactions and cannot be deleted." }, { status: 409 });
    }
    console.error("DELETE category error:", error);
    return Response.json({ message: "Failed to delete category" }, { status: 500 });
  }
}
