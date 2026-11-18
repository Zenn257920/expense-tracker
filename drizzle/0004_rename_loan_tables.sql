ALTER TYPE "public"."debt_type" RENAME TO "loan_type";--> statement-breakpoint
ALTER TABLE "debt_payments" RENAME TO "loan_payments";--> statement-breakpoint
ALTER TABLE "debts" RENAME TO "loans";--> statement-breakpoint
ALTER TABLE "loan_payments" RENAME COLUMN "debt_id" TO "loan_id";--> statement-breakpoint
ALTER TABLE "loan_payments" RENAME CONSTRAINT "debt_payments_pkey" TO "loan_payments_pkey";--> statement-breakpoint
ALTER TABLE "loans" RENAME CONSTRAINT "debts_pkey" TO "loans_pkey";--> statement-breakpoint
ALTER TABLE "loan_payments" RENAME CONSTRAINT "debt_payments_debt_id_debts_id_fk" TO "loan_payments_loan_id_loans_id_fk";--> statement-breakpoint
ALTER TABLE "loans" RENAME CONSTRAINT "debts_user_id_user_id_fk" TO "loans_user_id_user_id_fk";--> statement-breakpoint
ALTER INDEX "debt_payments_debt_id_idx" RENAME TO "loan_payments_loan_id_idx";--> statement-breakpoint
ALTER INDEX "debts_user_id_idx" RENAME TO "loans_user_id_idx";--> statement-breakpoint
ALTER INDEX "debts_user_due_date_idx" RENAME TO "loans_user_due_date_idx";
