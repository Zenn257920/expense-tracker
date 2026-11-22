"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { LoanPaymentRecord } from "@/types/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatMoneySuffix } from "@/lib/format";
import type { Loan } from "@/types/loan";

interface LoanPaymentHistoryDialogProps {
  loan: Loan;
  onChanged: () => void;
  /** Extra classes for the trigger button (e.g. full-width on mobile cards). */
  className?: string;
}

interface EditPaymentForm {
  amount: string;
  paymentDate: string;
  note: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export default function LoanPaymentHistoryDialog({
  loan,
  onChanged,
  className,
}: LoanPaymentHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Awaited<
    ReturnType<typeof api.getLoanPayments>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<LoanPaymentRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditPaymentForm>({
    amount: "",
    paymentDate: "",
    note: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<LoanPaymentRecord | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let isActive = true;

    async function loadHistory() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await api.getLoanPayments(loan.id);
        if (isActive) setHistory(result);
      } catch (err) {
        if (isActive)
          setLoadError(
            getApiErrorMessage(err, "Could not load payment history."),
          );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadHistory();
    return () => {
      isActive = false;
    };
  }, [loan.id, open, refreshKey]);

  const reloadHistory = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  function startEditing(payment: LoanPaymentRecord) {
    setEditing(payment);
    setEditForm({
      amount: String(payment.amount),
      paymentDate: payment.paymentDate.slice(0, 10),
      note: payment.note ?? "",
    });
    setActionError(null);
    setEditOpen(true);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !history) return;
    const amount = Number(editForm.amount);
    const allowedAmount =
      history.loan.originalAmount - (history.loan.paidAmount - editing.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("Enter an amount greater than zero.");
      return;
    }
    if (amount > allowedAmount) {
      setActionError(
        "The edited payment cannot make total payments exceed the original loan amount.",
      );
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      await api.updateLoanPayment(loan.id, editing.id, {
        amount,
        paymentDate: editForm.paymentDate,
        note: editForm.note.trim() || undefined,
      });
      setEditOpen(false);
      setEditing(null);
      toast.success("Payment updated successfully.");
      reloadHistory();
      onChanged();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not update payment."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await api.deleteLoanPayment(loan.id, deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Payment deleted successfully.");
      reloadHistory();
      onChanged();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not delete payment."));
      setDeleteTarget(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={className}
            >
              Payment History
            </Button>
          }
        />
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment history</DialogTitle>
            <DialogDescription>
              Payments for {loan.personName} ({loan.type}).
            </DialogDescription>
          </DialogHeader>

          {history && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Summary
                label="Original loan"
                value={formatMoneySuffix(history.loan.originalAmount)}
              />
              <Summary
                label="Total paid"
                value={formatMoneySuffix(history.loan.paidAmount)}
              />
              <Summary
                label="Remaining"
                value={formatMoneySuffix(history.loan.remainingAmount)}
              />
              <Summary
                label="Payments"
                value={String(history.loan.paymentCount)}
              />
            </div>
          )}

          {actionError && <FieldError>{actionError}</FieldError>}
          {loadError ? (
            <div className="space-y-3">
              <FieldError>{loadError}</FieldError>
              <Button type="button" variant="outline" onClick={reloadHistory}>
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner /> Loading payment history...
            </div>
          ) : history?.payments.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No payments recorded</EmptyTitle>
                <EmptyDescription>
                  Payments for this loan will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y rounded-lg border">
              {history?.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium tabular-nums">
                        {formatMoneySuffix(payment.amount)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(payment.paymentDate)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {payment.note || "No note"}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Edit payment"
                      onClick={() => startEditing(payment)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      aria-label="Delete payment"
                      onClick={() => setDeleteTarget(payment)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          setEditOpen(nextOpen);
          if (!nextOpen) setActionError(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit payment</DialogTitle>
            <DialogDescription>
              Update the amount, date, or note for this payment.
            </DialogDescription>
          </DialogHeader>
          {editing && history && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`edit-payment-amount-${editing.id}`}>
                    Payment amount (MMK)
                  </FieldLabel>
                  <Input
                    id={`edit-payment-amount-${editing.id}`}
                    type="number"
                    min="0.01"
                    max={
                      history.loan.originalAmount -
                      (history.loan.paidAmount - editing.amount)
                    }
                    step="0.01"
                    required
                    value={editForm.amount}
                    onChange={(event) =>
                      setEditForm({ ...editForm, amount: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`edit-payment-date-${editing.id}`}>
                    Payment date
                  </FieldLabel>
                  <Input
                    id={`edit-payment-date-${editing.id}`}
                    type="date"
                    required
                    value={editForm.paymentDate}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        paymentDate: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <Label htmlFor={`edit-payment-note-${editing.id}`}>
                    Note (Optional)
                  </Label>
                  <Textarea
                    id={`edit-payment-note-${editing.id}`}
                    maxLength={2000}
                    value={editForm.note}
                    onChange={(event) =>
                      setEditForm({ ...editForm, note: event.target.value })
                    }
                  />
                </Field>
              </FieldGroup>
              {actionError && <FieldError>{actionError}</FieldError>}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} variant="outline">
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${formatMoneySuffix(deleteTarget.amount)} payment from ${formatDate(deleteTarget.paymentDate)} will be removed.`
                : "This payment will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}
