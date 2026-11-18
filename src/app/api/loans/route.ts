import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { desc, eq, inArray, sum } from "drizzle-orm";
import { db } from "@/db";
import { loans, loanPayments } from "@/db/schema";
import { auth } from "@/lib/auth";

// ==========================================
// 1. VALIDATION SCHEMA
// ==========================================

const createLoanSchema = z
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
    const validation = createLoanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid loan information",
          errors: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Insert into database
    const [newLoan] = await db
      .insert(loans)
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

    // Return created loan
    return NextResponse.json(
      {
        message: "Loan created successfully",
        data: newLoan,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE_LOAN_ERROR:", error);

    return NextResponse.json(
      { message: "Something went wrong while creating loan" },
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

    // 2. Get only loans belonging to the logged-in user
    const [userLoans, recentPayments] = await Promise.all([
      db
        .select()
        .from(loans)
        .where(eq(loans.userId, session.user.id))
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
        .where(eq(loans.userId, session.user.id))
        .orderBy(desc(loanPayments.paymentDate), desc(loanPayments.createdAt))
        .limit(5),
    ]);

    // 3. If the user has no loans, return an empty array
    if (userLoans.length === 0) {
      return NextResponse.json({
        message: "Loans retrieved successfully",
        data: [],
        recentPayments,
      });
    }

    // 4. Get all payment totals for these loans
    const loanIds = userLoans.map((loan) => loan.id);

    const paymentTotals = await db
      .select({
        loanId: loanPayments.loanId,
        paidAmount: sum(loanPayments.amount),
      })
      .from(loanPayments)
      .where(inArray(loanPayments.loanId, loanIds))
      .groupBy(loanPayments.loanId);

    // 5. Create a lookup for each loan's total payments
    const paymentMap = new Map(
      paymentTotals.map((payment) => [
        payment.loanId,
        Number(payment.paidAmount ?? 0),
      ]),
    );

    // 6. Calculate remaining balance and status
    const today = new Date().toISOString().slice(0, 10);

    const result = userLoans.map((loan) => {
      const paidAmount = paymentMap.get(loan.id) ?? 0;

      const remainingAmount = Math.max(0, Number(loan.amount) - paidAmount);

      let status: "active" | "partially_paid" | "paid" | "overdue";

      if (remainingAmount <= 0) {
        status = "paid";
      } else if (loan.dueDate < today) {
        status = "overdue";
      } else if (paidAmount > 0) {
        status = "partially_paid";
      } else {
        status = "active";
      }

      return {
        ...loan,
        paidAmount,
        remainingAmount,
        status,
      };
    });

    // 7. Return the result
    return NextResponse.json({
      message: "Loans retrieved successfully",
      data: result,
      recentPayments,
    });
  } catch (error) {
    console.error("GET_LOANS_ERROR:", error);

    return NextResponse.json(
      { message: "Something went wrong while retrieving loans" },
      { status: 500 },
    );
  }
}
