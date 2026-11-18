import { Pool } from "@neondatabase/serverless";
import { and, count, desc, eq, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";

import * as schema from "@/db/schema";
import { loans, loanPayments } from "@/db/schema";
import { ApiError } from "@/lib/api-error";
import { isValidDate } from "@/lib/validation";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is missing");

const pool = new Pool({ connectionString: databaseUrl });
const paymentDb = drizzle({ client: pool, schema });

function isValidPaymentAmount(value: number) {
  const [coefficient, exponentValue] = value.toString().toLowerCase().split("e");
  const decimalPlaces = coefficient.split(".")[1]?.length ?? 0;
  const exponent = Number(exponentValue ?? 0);

  return (
    Number.isFinite(value) &&
    value > 0 &&
    value <= 999_999_999_999.99 &&
    Math.max(0, decimalPlaces - exponent) <= 2
  );
}

const createPaymentSchema = z.object({
  amount: z.coerce
    .number()
    .finite()
    .refine(isValidPaymentAmount, "Payment amount must be positive and have no more than two decimal places"),
  paymentDate: z.string().refine(isValidDate, "Invalid payment date"),
  note: z.string().max(2000).optional().nullable(),
});

const updatePaymentSchema = z
  .object({
    amount: createPaymentSchema.shape.amount.optional(),
    paymentDate: createPaymentSchema.shape.paymentDate.optional(),
    note: z.string().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one payment field is required");

async function selectLoanForUpdate(tx: Parameters<Parameters<typeof paymentDb.transaction>[0]>[0], userId: string, loanId: string) {
  const [loan] = await tx
    .select({ id: loans.id, amount: loans.amount, dueDate: loans.dueDate })
    .from(loans)
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)))
    .for("update");
  if (!loan) throw new ApiError("Loan not found", 404);
  return loan;
}

async function getLoanPaymentSummary(tx: Parameters<Parameters<typeof paymentDb.transaction>[0]>[0], loan: { id: string; amount: number; dueDate: string }) {
  const [paymentTotal, paymentCount] = await Promise.all([
    tx.select({ paidAmount: sum(loanPayments.amount) })
      .from(loanPayments)
      .where(eq(loanPayments.loanId, loan.id)),
    tx.select({ count: count() })
      .from(loanPayments)
      .where(eq(loanPayments.loanId, loan.id)),
  ]);
  const paidAmount = Number(paymentTotal[0]?.paidAmount ?? 0);
  const remainingAmount = Math.max(0, Number(loan.amount) - paidAmount);
  const today = new Date().toISOString().slice(0, 10);
  const status =
    remainingAmount === 0
      ? "paid"
      : loan.dueDate < today
        ? "overdue"
        : paidAmount > 0
          ? "partially_paid"
          : "active";
  return {
    id: loan.id,
    originalAmount: Number(loan.amount),
    paidAmount,
    remainingAmount,
    paymentCount: Number(paymentCount[0]?.count ?? 0),
    status,
  };
}

export async function createLoanPayment(userId: string, loanId: string, input: unknown) {
  const validation = createPaymentSchema.safeParse(input);
  if (!validation.success) {
    throw new ApiError(validation.error.issues[0]?.message ?? "Invalid payment information", 400);
  }

  return paymentDb.transaction(async (tx) => {
    const loan = await selectLoanForUpdate(tx, userId, loanId);

    const [paymentTotal] = await tx
      .select({ paidAmount: sum(loanPayments.amount) })
      .from(loanPayments)
      .where(eq(loanPayments.loanId, loanId));

    const paidAmount = Number(paymentTotal.paidAmount ?? 0);
    const originalAmount = Number(loan.amount);
    const remainingAmount = Math.max(0, originalAmount - paidAmount);
    const payment = validation.data;

    if (remainingAmount <= 0) throw new ApiError("This loan is already fully paid", 400);
    if (payment.amount > remainingAmount) {
      throw new ApiError("Payment cannot exceed the remaining balance", 400);
    }

    const [createdPayment] = await tx
      .insert(loanPayments)
      .values({
        loanId,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        note: payment.note?.trim() || null,
      })
      .returning();

    return {
      payment: createdPayment,
      loan: await getLoanPaymentSummary(tx, loan),
    };
  });
}

export async function getLoanPayments(userId: string, loanId: string) {
  return paymentDb.transaction(async (tx) => {
    const loan = await selectLoanForUpdate(tx, userId, loanId);
    const [payments, summary] = await Promise.all([
      tx.select({
        id: loanPayments.id,
        amount: loanPayments.amount,
        paymentDate: loanPayments.paymentDate,
        note: loanPayments.note,
        createdAt: loanPayments.createdAt,
      })
        .from(loanPayments)
        .where(eq(loanPayments.loanId, loanId))
        .orderBy(desc(loanPayments.paymentDate), desc(loanPayments.createdAt)),
      getLoanPaymentSummary(tx, loan),
    ]);
    return { payments, loan: summary };
  });
}

export async function updateLoanPayment(userId: string, loanId: string, paymentId: string, input: unknown) {
  const validation = updatePaymentSchema.safeParse(input);
  if (!validation.success) {
    throw new ApiError(validation.error.issues[0]?.message ?? "Invalid payment information", 400);
  }

  return paymentDb.transaction(async (tx) => {
    const loan = await selectLoanForUpdate(tx, userId, loanId);
    const [payment] = await tx.select().from(loanPayments)
      .where(and(eq(loanPayments.id, paymentId), eq(loanPayments.loanId, loanId)))
      .limit(1);
    if (!payment) throw new ApiError("Payment not found", 404);

    const [total] = await tx.select({ paidAmount: sum(loanPayments.amount) })
      .from(loanPayments).where(eq(loanPayments.loanId, loanId));
    const nextAmount = validation.data.amount ?? payment.amount;
    const updatedTotal = Number(total.paidAmount ?? 0) - Number(payment.amount) + nextAmount;
    if (updatedTotal > Number(loan.amount)) {
      throw new ApiError("Payment cannot make total payments exceed the original loan amount", 400);
    }

    const [updatedPayment] = await tx.update(loanPayments)
      .set({
        ...(validation.data.amount === undefined ? {} : { amount: validation.data.amount }),
        ...(validation.data.paymentDate === undefined ? {} : { paymentDate: validation.data.paymentDate }),
        ...(validation.data.note === undefined ? {} : { note: validation.data.note?.trim() || null }),
      })
      .where(and(eq(loanPayments.id, paymentId), eq(loanPayments.loanId, loanId)))
      .returning();

    return { payment: updatedPayment, loan: await getLoanPaymentSummary(tx, loan) };
  });
}

export async function deleteLoanPayment(userId: string, loanId: string, paymentId: string) {
  return paymentDb.transaction(async (tx) => {
    const loan = await selectLoanForUpdate(tx, userId, loanId);
    const [deleted] = await tx.delete(loanPayments)
      .where(and(eq(loanPayments.id, paymentId), eq(loanPayments.loanId, loanId)))
      .returning({ id: loanPayments.id });
    if (!deleted) throw new ApiError("Payment not found", 404);
    return { paymentId: deleted.id, loan: await getLoanPaymentSummary(tx, loan) };
  });
}
