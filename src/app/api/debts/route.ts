import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { desc, eq, inArray, sum } from "drizzle-orm";
import { db } from "@/db";
import { debts, debtPayments } from "@/db/schema";
import { auth } from "@/lib/auth";

// ==========================================
// 1. VALIDATION SCHEMA
// ==========================================

const createDebtSchema = z
  .object({
    personName: z.string().trim().min(1, "Person name is required").max(255),

    type: z.enum(["borrowed", "lent"]),

    amount: z.coerce
      .number()
      .positive("Amount must be greater than zero")
      .finite(),

    interestRate: z.coerce
      .number()
      .min(0, "Interest cannot be negative")
      .max(100, "Interest rate cannot exceed 100")
      .finite()
      .default(0),

    borrowedDate: z.string().date(),

    dueDate: z.string().date(),

    description: z.string().max(2000).optional().nullable(),
  })
  .refine((data) => data.dueDate >= data.borrowedDate, {
    message: "Due date must be after or equal to start date",
    path: ["dueDate"],
  });

// ==========================================
// 2. POST API
// ==========================================

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Check authentication
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 },
      );
    }

    // Read request body
    const body = await request.json();

    // Validate request data
    const validation = createDebtSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid debt information",
          errors: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Insert into database
    const [newDebt] = await db
      .insert(debts)
      .values({
        userId: session.user.id,
        personName: data.personName,
        type: data.type,
        amount: data.amount,
        interestRate: data.interestRate,
        startDate: data.borrowedDate,
        dueDate: data.dueDate,
        description: data.description || null,
      })
      .returning();

    // Return created debt
    return NextResponse.json(
      {
        message: "Debt created successfully",
        data: newDebt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE_DEBT_ERROR:", error);

    return NextResponse.json(
      { message: "Something went wrong while creating debt" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // 1. Check whether the user is logged in
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 },
      );
    }

    // 2. Get only debts belonging to the logged-in user
    const [userDebts, recentPayments] = await Promise.all([
      db
        .select()
        .from(debts)
        .where(eq(debts.userId, session.user.id))
        .orderBy(debts.createdAt),
      db
        .select({
          id: debtPayments.id,
          personName: debts.personName,
          type: debts.type,
          amount: debtPayments.amount,
          paymentDate: debtPayments.paymentDate,
          note: debtPayments.note,
        })
        .from(debtPayments)
        .innerJoin(debts, eq(debtPayments.debtId, debts.id))
        .where(eq(debts.userId, session.user.id))
        .orderBy(desc(debtPayments.paymentDate), desc(debtPayments.createdAt))
        .limit(5),
    ]);

    // 3. If the user has no debts, return an empty array
    if (userDebts.length === 0) {
      return NextResponse.json({
        message: "Debts retrieved successfully",
        data: [],
        recentPayments,
      });
    }

    // 4. Get all payment totals for these debts
    const debtIds = userDebts.map((debt) => debt.id);

    const paymentTotals = await db
      .select({
        debtId: debtPayments.debtId,
        paidAmount: sum(debtPayments.amount),
      })
      .from(debtPayments)
      .where(inArray(debtPayments.debtId, debtIds))
      .groupBy(debtPayments.debtId);

    // 5. Create a lookup for each debt's total payments
    const paymentMap = new Map(
      paymentTotals.map((payment) => [
        payment.debtId,
        Number(payment.paidAmount ?? 0),
      ]),
    );

    // 6. Calculate remaining balance and status
    const today = new Date().toISOString().slice(0, 10);

    const result = userDebts.map((debt) => {
      const paidAmount = paymentMap.get(debt.id) ?? 0;

      const remainingAmount = Math.max(0, Number(debt.amount) - paidAmount);

      let status: "active" | "partially_paid" | "paid" | "overdue";

      if (remainingAmount <= 0) {
        status = "paid";
      } else if (debt.dueDate < today) {
        status = "overdue";
      } else if (paidAmount > 0) {
        status = "partially_paid";
      } else {
        status = "active";
      }

      return {
        ...debt,
        paidAmount,
        remainingAmount,
        status,
      };
    });

    // 7. Return the result
    return NextResponse.json({
      message: "Debts retrieved successfully",
      data: result,
      recentPayments,
    });
  } catch (error) {
    console.error("GET_DEBTS_ERROR:", error);

    return NextResponse.json(
      { message: "Something went wrong while retrieving debts" },
      { status: 500 },
    );
  }
}
