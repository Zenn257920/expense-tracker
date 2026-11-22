"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import AddLoanDialog from "@/components/loans/add-loan-dialog";
import LoanSummary from "@/components/loans/loan-summary";
import LoanDashboardOverview from "@/components/loans/loan-dashboard-overview";
import LoanPaymentHistoryDialog from "@/components/loans/loan-payment-history-dialog";
import LoanRecordPaymentDialog from "@/components/loans/loan-record-payment-dialog";
import LoanRecentPaymentsDialog from "@/components/loans/loan-recent-payments-dialog";
import { api } from "@/lib/api";
import type { LoanPaymentInput, RecentLoanPayment } from "@/types/api";
import {
  calculateLoanOverview,
  calculateLoanProgress,
} from "@/lib/loan-analytics";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatMoneySuffix, formatNumericDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CreateLoanInput, Loan, LoanType } from "@/types/loan";

type LoanFilter = "all" | LoanType;
// Interest rate is not collected: it is stored but never calculated, and
// the server defaults it to 0 when omitted from the payload.
type LoanEditForm = Omit<CreateLoanInput, "interestRate">;

const loanTypeItems = [
  { label: "Borrowed", value: "borrowed" },
  { label: "Lent", value: "lent" },
];

const statusLabels: Record<Loan["status"], string> = {
  active: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
};
const LOAN_PAGE_SIZE = 5;

export default function LoanPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentLoanPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LoanFilter>("all");
  const [search, setSearch] = useState("");
  const [loanPage, setLoanPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [editForm, setEditForm] = useState<LoanEditForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadLoans() {
      try {
        const result = await api.getLoans();
        if (isActive) {
          setLoans(result.loans);
          setRecentPayments(result.recentPayments);
          setError(null);
        }
      } catch (err) {
        if (isActive)
          setError(getApiErrorMessage(err, "Could not load loans."));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadLoans();
    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const refreshLoans = useCallback((showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }, []);

  async function handleAddLoan(data: Omit<CreateLoanInput, "interestRate">) {
    try {
      // The server defaults interestRate to 0; it is intentionally not sent.
      await api.createLoan(data as CreateLoanInput);
      refreshLoans();
      toast.success("Loan added successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create loan."));
      throw err;
    }
  }

  async function handleRecordPayment(loanId: string, input: LoanPaymentInput) {
    await api.createLoanPayment(loanId, input);
    toast.success("Payment recorded successfully.");
    refreshLoans();
  }

  function startEditing(loan: Loan) {
    setEditing(loan);
    setActionError(null);
    setEditForm({
      personName: loan.personName,
      type: loan.type,
      amount: loan.amount,
      borrowedDate: loan.borrowedDate.slice(0, 10),
      dueDate: loan.dueDate.slice(0, 10),
      description: loan.description ?? "",
    });
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editForm) return;
    if (editForm.dueDate < editForm.borrowedDate) {
      setActionError("Due date must be on or after the start date.");
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      await api.updateLoan(editing.id, {
        personName: editForm.personName.trim(),
        type: editForm.type,
        amount: Number(editForm.amount),
        borrowedDate: editForm.borrowedDate,
        dueDate: editForm.dueDate,
        description: editForm.description?.trim() || null,
      });
      setEditing(null);
      setEditForm(null);
      toast.success("Loan updated successfully.");
      refreshLoans();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Failed to update loan."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await api.deleteLoan(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Loan deleted successfully.");
      refreshLoans();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Failed to delete loan."));
      setDeleteTarget(null);
    } finally {
      setIsSaving(false);
    }
  }

  const visibleLoans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return loans.filter(
      (loan) =>
        (filter === "all" || loan.type === filter) &&
        (!query ||
          loan.personName.toLocaleLowerCase().includes(query) ||
          loan.description?.toLocaleLowerCase().includes(query)),
    );
  }, [loans, filter, search]);
  const loanTotalPages = Math.ceil(visibleLoans.length / LOAN_PAGE_SIZE);
  const currentLoanPage = Math.min(loanPage, Math.max(1, loanTotalPages));
  const paginatedLoans = visibleLoans.slice(
    (currentLoanPage - 1) * LOAN_PAGE_SIZE,
    currentLoanPage * LOAN_PAGE_SIZE,
  );

  const overview = useMemo(() => calculateLoanOverview(loans), [loans]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Management</h1>
          <p className="text-muted-foreground">
            Manage money you borrowed and money you lent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LoanRecentPaymentsDialog
            payments={recentPayments}
            isLoading={isLoading}
            error={error}
          />
          <AddLoanDialog onAdd={handleAddLoan} />
        </div>
      </div>

      <section className="min-w-0 space-y-4">
        {actionError && <FieldError>{actionError}</FieldError>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={filter}
            onValueChange={(value) => {
              if (value) {
                setFilter(value as LoanFilter);
                setLoanPage(1);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All loans</TabsTrigger>
              <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
              <TabsTrigger value="lent">Lent</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLoanPage(1);
            }}
            placeholder="Search people or descriptions..."
            aria-label="Search loans"
            className="sm:max-w-xs"
          />
        </div>

        {error ? (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <FieldError>{error}</FieldError>
            <Button variant="outline" onClick={() => refreshLoans()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Spinner /> Loading loans...
          </div>
        ) : visibleLoans.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>
                {loans.length === 0 ? "No loans yet" : "No matching loans"}
              </EmptyTitle>
              <EmptyDescription>
                {loans.length === 0
                  ? "Add a loan to see your balances here."
                  : "Try changing your search or loan type."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-3 sm:hidden">
              {paginatedLoans.map((loan) => (
                <li key={loan.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {loan.personName}
                          </p>
                          {loan.description && (
                            <p className="truncate text-xs text-muted-foreground">
                              {loan.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="capitalize">{loan.type}</span>
                            {" · "}
                            {formatNumericDate(loan.borrowedDate)}
                            {" → "}
                            {formatNumericDate(loan.dueDate)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            loan.status === "overdue"
                              ? "destructive"
                              : loan.status === "paid"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {statusLabels[loan.status]}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Amount
                          </p>
                          <p className="font-medium tabular-nums">
                            {formatMoneySuffix(loan.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Paid</p>
                          <p className="font-medium tabular-nums">
                            {formatMoneySuffix(loan.paidAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Remaining
                          </p>
                          <p className="font-medium tabular-nums">
                            {formatMoneySuffix(loan.remainingAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {calculateLoanProgress(loan).toFixed(1)}% repaid
                        </span>
                        <Progress
                          value={calculateLoanProgress(loan)}
                          aria-label={`${loan.personName} repayment progress`}
                          className="gap-0"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        {loan.remainingAmount > 0 && (
                          <LoanRecordPaymentDialog
                            loan={loan}
                            onPayment={handleRecordPayment}
                            className="h-10 w-full"
                          />
                        )}
                        <div className="flex gap-2">
                          <LoanPaymentHistoryDialog
                            loan={loan}
                            onChanged={() => refreshLoans(false)}
                            className="h-10 flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            aria-label="Edit loan"
                            onClick={() => startEditing(loan)}
                          >
                            <Pencil data-icon="inline-start" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-10 w-10"
                            aria-label="Delete loan"
                            onClick={() => setDeleteTarget(loan)}
                          >
                            <Trash2 data-icon="inline-start" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-lg border sm:block">
              <Table className="min-w-[1020px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Borrowed</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="max-w-56">
                      <div className="truncate font-medium">
                        {loan.personName}
                      </div>
                      {loan.description && (
                        <div className="truncate text-xs text-muted-foreground">
                          {loan.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{loan.type}</TableCell>
                    <TableCell>{formatNumericDate(loan.borrowedDate)}</TableCell>
                    <TableCell>{formatNumericDate(loan.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneySuffix(loan.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneySuffix(loan.paidAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoneySuffix(loan.remainingAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-24 flex-col gap-1">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {calculateLoanProgress(loan).toFixed(1)}%
                        </span>
                        <Progress
                          value={calculateLoanProgress(loan)}
                          aria-label={`${loan.personName} repayment progress`}
                          className="gap-0"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          loan.status === "overdue"
                            ? "destructive"
                            : loan.status === "paid"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {statusLabels[loan.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {loan.remainingAmount > 0 && (
                          <LoanRecordPaymentDialog
                            loan={loan}
                            onPayment={handleRecordPayment}
                          />
                        )}
                        <LoanPaymentHistoryDialog
                          loan={loan}
                          onChanged={() => refreshLoans(false)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Edit loan"
                          onClick={() => startEditing(loan)}
                        >
                          <Pencil data-icon="inline-start" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          aria-label="Delete loan"
                          onClick={() => setDeleteTarget(loan)}
                        >
                          <Trash2 data-icon="inline-start" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </>
        )}
        {!error && !isLoading && visibleLoans.length > 0 && (
          <TablePagination
            page={currentLoanPage}
            totalPages={loanTotalPages}
            totalItems={visibleLoans.length}
            pageSize={LOAN_PAGE_SIZE}
            itemLabel="loans"
            onPageChange={setLoanPage}
          />
        )}
      </section>

      <LoanSummary
        overview={overview}
        isLoading={isLoading}
        hasError={Boolean(error)}
      />

      <LoanDashboardOverview
        overview={overview}
        isLoading={isLoading}
        error={error}
      />

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setEditing(null);
            setEditForm(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit loan</DialogTitle>
            <DialogDescription>
              Update the details for {editing?.personName}.
            </DialogDescription>
          </DialogHeader>
          {editing && editForm && (
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <FieldGroup className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`loan-person-${editing.id}`}>
                    Person
                  </FieldLabel>
                  <Input
                    id={`loan-person-${editing.id}`}
                    value={editForm.personName}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        personName: event.target.value,
                      })
                    }
                    maxLength={255}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`loan-type-${editing.id}`}>
                    Type
                  </FieldLabel>
                  <Select
                    items={loanTypeItems}
                    value={editForm.type}
                    onValueChange={(value) =>
                      value &&
                      setEditForm({
                        ...editForm,
                        type: value as LoanType,
                      })
                    }
                  >
                    <SelectTrigger
                      id={`loan-type-${editing.id}`}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {loanTypeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`loan-amount-${editing.id}`}>
                    Amount (MMK)
                  </FieldLabel>
                  <Input
                    id={`loan-amount-${editing.id}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        amount: Number(event.target.value),
                      })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`loan-start-${editing.id}`}>
                    Start date
                  </FieldLabel>
                  <Input
                    id={`loan-start-${editing.id}`}
                    type="date"
                    value={editForm.borrowedDate}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        borrowedDate: event.target.value,
                      })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`loan-due-${editing.id}`}>
                    Due date
                  </FieldLabel>
                  <Input
                    id={`loan-due-${editing.id}`}
                    type="date"
                    min={editForm.borrowedDate}
                    value={editForm.dueDate}
                    onChange={(event) =>
                      setEditForm({ ...editForm, dueDate: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={`loan-description-${editing.id}`}>
                    Description
                  </FieldLabel>
                  <Input
                    id={`loan-description-${editing.id}`}
                    value={editForm.description ?? ""}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        description: event.target.value,
                      })
                    }
                    maxLength={2000}
                  />
                </Field>
              </FieldGroup>
              {actionError && <FieldError>{actionError}</FieldError>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => {
                    setEditing(null);
                    setEditForm(null);
                  }}
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
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the loan with{" "}
              {deleteTarget?.personName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete loan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
