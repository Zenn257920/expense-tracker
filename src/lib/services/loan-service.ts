import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { loans } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { isValidAmount } from "@/lib/validation";

const loanUpdateSchema = z
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

export async function updateLoan(userId: string, id: string, input: unknown) {
  const validation = loanUpdateSchema.safeParse(input);
  if (!validation.success) {
    throw new ApiError(validation.error.issues[0]?.message ?? "Invalid loan information", 400);
  }

  const [existing] = await db
    .select({ startDate: loans.startDate, dueDate: loans.dueDate })
    .from(loans)
    .where(and(eq(loans.id, id), eq(loans.userId, userId)))
    .limit(1);

  if (!existing) throw new ApiError("Loan not found", 404);

  const startDate = validation.data.startDate ?? existing.startDate;
  const dueDate = validation.data.dueDate ?? existing.dueDate;
  if (dueDate < startDate) {
    throw new ApiError("Due date must be after or equal to start date", 400);
  }

  const [updated] = await db
    .update(loans)
    .set({ ...validation.data, updatedAt: new Date() })
    .where(and(eq(loans.id, id), eq(loans.userId, userId)))
    .returning();

  if (!updated) throw new ApiError("Loan not found", 404);
  return updated;
}

export async function deleteLoan(userId: string, id: string) {
  const [deleted] = await db
    .delete(loans)
    .where(and(eq(loans.id, id), eq(loans.userId, userId)))
    .returning({ id: loans.id });

  if (!deleted) throw new ApiError("Loan not found", 404);
  return deleted;
}
