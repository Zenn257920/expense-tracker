import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { debts } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { isValidAmount } from "@/lib/validation";

const debtUpdateSchema = z
  .object({
    personName: z.string().trim().min(1, "Person name is required").max(255).optional(),
    type: z.enum(["borrowed", "lent"]).optional(),
    amount: z.coerce.number().positive().finite().refine(isValidAmount, "Amount must be positive and have no more than two decimal places").optional(),
    interestRate: z.coerce.number().min(0).max(100).finite().optional(),
    startDate: z.string().date().optional(),
    dueDate: z.string().date().optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

export async function updateDebt(userId: string, id: string, input: unknown) {
  const validation = debtUpdateSchema.safeParse(input);
  if (!validation.success) {
    throw new ApiError(validation.error.issues[0]?.message ?? "Invalid debt information", 400);
  }

  const [existing] = await db
    .select({ startDate: debts.startDate, dueDate: debts.dueDate })
    .from(debts)
    .where(and(eq(debts.id, id), eq(debts.userId, userId)))
    .limit(1);

  if (!existing) throw new ApiError("Debt not found", 404);

  const startDate = validation.data.startDate ?? existing.startDate;
  const dueDate = validation.data.dueDate ?? existing.dueDate;
  if (dueDate < startDate) {
    throw new ApiError("Due date must be after or equal to start date", 400);
  }

  const [updated] = await db
    .update(debts)
    .set({ ...validation.data, updatedAt: new Date() })
    .where(and(eq(debts.id, id), eq(debts.userId, userId)))
    .returning();

  if (!updated) throw new ApiError("Debt not found", 404);
  return updated;
}

export async function deleteDebt(userId: string, id: string) {
  const [deleted] = await db
    .delete(debts)
    .where(and(eq(debts.id, id), eq(debts.userId, userId)))
    .returning({ id: debts.id });

  if (!deleted) throw new ApiError("Debt not found", 404);
  return deleted;
}
