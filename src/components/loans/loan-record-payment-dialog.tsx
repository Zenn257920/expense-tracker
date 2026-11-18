"use client";

import { useState, type FormEvent } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatMoneySuffix } from "@/lib/format";
import type { Loan } from "@/types/loan";

interface LoanRecordPaymentDialogProps {
  loan: Loan;
  onPayment: (
    loanId: string,
    input: { amount: number; paymentDate: string; note?: string },
  ) => Promise<void>;
}

export default function LoanRecordPaymentDialog({
  loan,
  onPayment,
}: LoanRecordPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (numericAmount > loan.remainingAmount) {
      setError("Payment cannot exceed the remaining balance.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onPayment(loan.id, {
        amount: numericAmount,
        paymentDate,
        note: note.trim() || undefined,
      });
      setAmount("");
      setNote("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not record payment."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            Payment
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            {loan.type === "borrowed"
              ? "Record a repayment you made"
              : "Record a repayment you received"}{" "}
            for {loan.personName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-3">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
            <p className="text-xs text-muted-foreground">Original</p>
            <p className="truncate text-right font-medium sm:text-left">{formatMoneySuffix(loan.amount)}</p>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="truncate text-right font-medium sm:text-left">{formatMoneySuffix(loan.paidAmount)}</p>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="truncate text-right font-medium sm:text-left">{formatMoneySuffix(loan.remainingAmount)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`payment-amount-${loan.id}`}>
              Payment amount (MMK)
            </Label>
            <Input
              id={`payment-amount-${loan.id}`}
              type="number"
              min="0.01"
              max={loan.remainingAmount}
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`Up to ${loan.remainingAmount.toLocaleString()}`}
            />
            <button
              type="button"
              className="text-xs text-primary underline-offset-4 hover:underline"
              onClick={() => setAmount(String(loan.remainingAmount))}
            >
              Pay remaining balance
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`payment-date-${loan.id}`}>Payment date</Label>
            <Input
              id={`payment-date-${loan.id}`}
              type="date"
              required
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`payment-note-${loan.id}`}>Note (Optional)</Label>
            <Textarea
              id={`payment-note-${loan.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              placeholder="Add a note about this payment..."
              className="min-h-20"
            />
          </div>

          {error && <FieldError>{error}</FieldError>}
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={isSaving || loan.remainingAmount <= 0}
          >
            {isSaving ? "Saving payment..." : "Save payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
