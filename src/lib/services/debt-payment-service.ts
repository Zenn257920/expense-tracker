import { Pool } from "@neondatabase/serverless";
import { and, count, desc, eq, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";

import * as schema from "@/db/schema";
import { debts, debtPayments } from "@/db/schema";
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

async function selectDebtForUpdate(tx: Parameters<Parameters<typeof paymentDb.transaction>[0]>[0], userId: string, debtId: string) {
  const [debt] = await tx
    .select({ id: debts.id, amount: debts.amount, dueDate: debts.dueDate })
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .for("update");
  if (!debt) throw new ApiError("Debt not found", 404);
  return debt;
}

async function getDebtPaymentSummary(tx: Parameters<Parameters<typeof paymentDb.transaction>[0]>[0], debt: { id: string; amount: number; dueDate: string }) {
  const [paymentTotal, paymentCount] = await Promise.all([
    tx.select({ paidAmount: sum(debtPayments.amount) })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debt.id)),
    tx.select({ count: count() })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debt.id)),
  ]);
  const paidAmount = Number(paymentTotal[0]?.paidAmount ?? 0);
  const remainingAmount = Math.max(0, Number(debt.amount) - paidAmount);
  const today = new Date().toISOString().slice(0, 10);
  const status =
    remainingAmount === 0
      ? "paid"
      : debt.dueDate < today
        ? "overdue"
        : paidAmount > 0
          ? "partially_paid"
          : "active";
  return {
    id: debt.id,
    originalAmount: Number(debt.amount),
    paidAmount,
    remainingAmount,
    paymentCount: Number(paymentCount[0]?.count ?? 0),
    status,
  };
}

export async function createDebtPayment(userId: string, debtId: string, input: unknown) {
  const validation = createPaymentSchema.safeParse(input);
  if (!validation.success) {
    throw new ApiError(validation.error.issues[0]?.message ?? "Invalid payment information", 400);
  }

  return paymentDb.transaction(async (tx) => {
    const debt = await selectDebtForUpdate(tx, userId, debtId);

    const [paymentTotal] = await tx
      .select({ paidAmount: sum(debtPayments.amount) })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debtId));

    const paidAmount = Number(paymentTotal.paidAmount ?? 0);
    const originalAmount = Number(debt.amount);
    const remainingAmount = Math.max(0, originalAmount - paidAmount);
    const payment = validation.data;

    if (remainingAmount <= 0) throw new ApiError("This debt is already fully paid", 400);
    if (payment.amount > remainingAmount) {
      throw new ApiError("Payment cannot exceed the remaining balance", 400);
    }

    const [createdPayment] = await tx
      .insert(debtPayments)
      .values({
        debtId,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        note: payment.note?.trim() || null,
      })
      .returning();

    return {
      payment: createdPayment,
      debt: await getDebtPaymentSummary(tx, debt),
    };
  });
}

export async function getDebtPayments(userId: string, debtId: string) {
  return paymentDb.transaction(async (tx) => {
    const debt = await selectDebtForUpdate(tx, userId, debtId);
    const [payments, summary] = await Promise.all([
      tx.select({
        id: debtPayments.id,
        amount: debtPayments.amount,
        paymentDate: debtPayments.paymentDate,
        note: debtPayments.note,
        createdAt: debtPayments.createdAt,
      })
        .from(debtPayments)
        .where(eq(debtPayments.debtId, debtId))
        .orderBy(desc(debtPayments.paymentDate), desc(debtPayments.createdAt)),
      getDebtPaymentSummary(tx, debt),
    ]);
    return { payments, debt: summary };
  });
}

export async function updateDebtPayment(userId: string, debtId: string, paymentId: string, input: unknown) {
  const validation = updatePaymentSchema.safeParse(input);
  if (!validation.success) {
    throw new ApiError(validation.error.issues[0]?.message ?? "Invalid payment information", 400);
  }

  return paymentDb.transaction(async (tx) => {
    const debt = await selectDebtForUpdate(tx, userId, debtId);
    const [payment] = await tx.select().from(debtPayments)
      .where(and(eq(debtPayments.id, paymentId), eq(debtPayments.debtId, debtId)))
      .limit(1);
    if (!payment) throw new ApiError("Payment not found", 404);

    const [total] = await tx.select({ paidAmount: sum(debtPayments.amount) })
      .from(debtPayments).where(eq(debtPayments.debtId, debtId));
    const nextAmount = validation.data.amount ?? payment.amount;
    const updatedTotal = Number(total.paidAmount ?? 0) - Number(payment.amount) + nextAmount;
    if (updatedTotal > Number(debt.amount)) {
      throw new ApiError("Payment cannot make total payments exceed the original debt amount", 400);
    }

    const [updatedPayment] = await tx.update(debtPayments)
      .set({
        ...(validation.data.amount === undefined ? {} : { amount: validation.data.amount }),
        ...(validation.data.paymentDate === undefined ? {} : { paymentDate: validation.data.paymentDate }),
        ...(validation.data.note === undefined ? {} : { note: validation.data.note?.trim() || null }),
      })
      .where(and(eq(debtPayments.id, paymentId), eq(debtPayments.debtId, debtId)))
      .returning();

    return { payment: updatedPayment, debt: await getDebtPaymentSummary(tx, debt) };
  });
}

export async function deleteDebtPayment(userId: string, debtId: string, paymentId: string) {
  return paymentDb.transaction(async (tx) => {
    const debt = await selectDebtForUpdate(tx, userId, debtId);
    const [deleted] = await tx.delete(debtPayments)
      .where(and(eq(debtPayments.id, paymentId), eq(debtPayments.debtId, debtId)))
      .returning({ id: debtPayments.id });
    if (!deleted) throw new ApiError("Payment not found", 404);
    return { paymentId: deleted.id, debt: await getDebtPaymentSummary(tx, debt) };
  });
}
