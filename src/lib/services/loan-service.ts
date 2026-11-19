import { and, desc, eq, inArray, sum } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { loans, loanPayments } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { getLoanStatus } from "@/lib/loan-status";
import { isValidLoanAmount } from "@/lib/validation";

const createLoanSchema = z
  .object({
    personName: z.string().trim().min(1, "Person name is required").max(255),
    type: z.enum(["borrowed", "lent"]),
    amount: z.coerce
      .number()
      .finite()
      .refine(
        isValidLoanAmount,
        "Amount must be positive, within the loan limit, and have no more than two decimal places",
      ),
    interestRate: z.coerce
      .number()
      .min(0)
      .max(100)
      .finite()
      .default(0),
    borrowedDate: z.string().date(),
    dueDate: z.string().date(),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => data.dueDate >= data.borrowedDate, {
    message: "Due date must be after or equal to start date",
    path: ["dueDate"],
  });

export async function createLoan(userId: string, input: unknown) {
  const validation = createLoanSchema.safeParse(input);
  if (!validation.success) {
    throw new ApiError(
      validation.error.issues[0]?.message ?? "Invalid loan information",
      400,
    );
  }

  const loan = validation.data;
  const [createdLoan] = await db
    .insert(loans)
    .values({
      userId,
      personName: loan.personName,
      type: loan.type,
      amount: loan.amount,
      interestRate: loan.interestRate,
      startDate: loan.borrowedDate,
      dueDate: loan.dueDate,
      description: loan.description || null,
    })
    .returning();

  return createdLoan;
}

export async function listLoans(userId: string) {
  const [userLoans, recentPayments] = await Promise.all([
    db
      .select()
      .from(loans)
      .where(eq(loans.userId, userId))
      .orderBy(loans.createdAt),
    db
      .select({
        id: loanPayments.id,
        personName: loans.personName,
        type: loans.type,
        amount: loanPayments.amount,
        paymentDate: loanPayments.paymentDate,
        note: loanPayments.note,
      })
      .from(loanPayments)
      .innerJoin(loans, eq(loanPayments.loanId, loans.id))
      .where(eq(loans.userId, userId))
      .orderBy(desc(loanPayments.paymentDate), desc(loanPayments.createdAt))
      .limit(5),
  ]);

  if (userLoans.length === 0) {
    return { data: [], recentPayments };
  }

  const loanIds = userLoans.map((loan) => loan.id);
  const paymentTotals = await db
    .select({ loanId: loanPayments.loanId, paidAmount: sum(loanPayments.amount) })
    .from(loanPayments)
    .where(inArray(loanPayments.loanId, loanIds))
    .groupBy(loanPayments.loanId);

  const paymentsByLoanId = new Map(
    paymentTotals.map((payment) => [
      payment.loanId,
      Number(payment.paidAmount ?? 0),
    ]),
  );
  const today = new Date().toISOString().slice(0, 10);

  const data = userLoans.map((loan) => {
    const paidAmount = paymentsByLoanId.get(loan.id) ?? 0;
    const remainingAmount = Math.max(0, Number(loan.amount) - paidAmount);

    return {
      ...loan,
      paidAmount,
      remainingAmount,
      status: getLoanStatus(remainingAmount, paidAmount, loan.dueDate, today),
    };
  });

  return { data, recentPayments };
}

const loanUpdateSchema = z
  .object({
    personName: z.string().trim().min(1, "Person name is required").max(255).optional(),
    type: z.enum(["borrowed", "lent"]).optional(),
    amount: z.coerce
      .number()
      .finite()
      .refine(
        isValidLoanAmount,
        "Amount must be positive, within the loan limit, and have no more than two decimal places",
      )
      .optional(),
    interestRate: z.coerce
      .number()
      .min(0)
      .max(100)
      .finite()
      .optional(),
    borrowedDate: z.string().date().optional(),
    dueDate: z.string().date().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
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

  const startDate = validation.data.borrowedDate ?? existing.startDate;
  const dueDate = validation.data.dueDate ?? existing.dueDate;
  if (dueDate < startDate) {
    throw new ApiError("Due date must be after or equal to start date", 400);
  }

  const { borrowedDate, ...updates } = validation.data;
  const [updated] = await db
    .update(loans)
    .set({
      ...updates,
      ...(borrowedDate === undefined ? {} : { startDate: borrowedDate }),
      updatedAt: new Date(),
    })
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
