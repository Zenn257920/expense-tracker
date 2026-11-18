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

import AddDebtDialog from "@/components/debits/add-debt-dialog";
import DebtSummary from "@/components/debits/debt-summary";
import DebtDashboardOverview from "@/components/debits/debt-dashboard-overview";
import DebtPaymentHistoryDialog from "@/components/debits/debt-payment-history-dialog";
import RecordPaymentDialog from "@/components/debits/record-payment-dialog";
import RecentPaymentsDialog from "@/components/debits/recent-payments-dialog";
import { api } from "@/lib/api";
import type { DebtPaymentInput, RecentDebtPayment } from "@/lib/api";
import {
  calculateDebtOverview,
  calculateDebtProgress,
} from "@/lib/debt-analytics";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { CreateDebtInput, Debt, DebtType } from "@/types/debt";

type DebtFilter = "all" | DebtType;
type DebtEditForm = CreateDebtInput;

const statusLabels: Record<Debt["status"], string> = {
  active: "Active",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
};
const DEBT_PAGE_SIZE = 5;

export default function DebtPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentDebtPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DebtFilter>("all");
  const [search, setSearch] = useState("");
  const [debtPage, setDebtPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [editForm, setEditForm] = useState<DebtEditForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadDebts() {
      try {
        const result = await api.getDebts();
        if (isActive) {
          setDebts(result.debts);
          setRecentPayments(result.recentPayments);
          setError(null);
        }
      } catch (err) {
        if (isActive)
          setError(getApiErrorMessage(err, "Could not load debts."));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadDebts();
    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const refreshDebts = useCallback((showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }, []);

  async function handleAddDebt(data: CreateDebtInput) {
    try {
      await api.createDebt(data);
      refreshDebts();
      toast.success("Debt added successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create debt."));
      throw err;
    }
  }

  async function handleRecordPayment(debtId: string, input: DebtPaymentInput) {
    await api.createDebtPayment(debtId, input);
    toast.success("Payment recorded successfully.");
    refreshDebts();
  }

  function startEditing(debt: Debt) {
    setEditing(debt);
    setActionError(null);
    setEditForm({
      personName: debt.personName,
      type: debt.type,
      amount: debt.amount,
      borrowedDate: debt.borrowedDate.slice(0, 10),
      dueDate: debt.dueDate.slice(0, 10),
      interestRate: debt.interestRate,
      description: debt.description ?? "",
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
      await api.updateDebt(editing.id, {
        personName: editForm.personName.trim(),
        type: editForm.type,
        amount: Number(editForm.amount),
        interestRate: Number(editForm.interestRate),
        startDate: editForm.borrowedDate,
        dueDate: editForm.dueDate,
        description: editForm.description?.trim() || null,
      });
      setEditing(null);
      setEditForm(null);
      toast.success("Debt updated successfully.");
      refreshDebts();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Failed to update debt."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await api.deleteDebt(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Debt deleted successfully.");
      refreshDebts();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Failed to delete debt."));
      setDeleteTarget(null);
    } finally {
      setIsSaving(false);
    }
  }

  const visibleDebts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return debts.filter(
      (debt) =>
        (filter === "all" || debt.type === filter) &&
        (!query ||
          debt.personName.toLocaleLowerCase().includes(query) ||
          debt.description?.toLocaleLowerCase().includes(query)),
    );
  }, [debts, filter, search]);
  const debtTotalPages = Math.ceil(visibleDebts.length / DEBT_PAGE_SIZE);
  const currentDebtPage = Math.min(debtPage, Math.max(1, debtTotalPages));
  const paginatedDebts = visibleDebts.slice(
    (currentDebtPage - 1) * DEBT_PAGE_SIZE,
    currentDebtPage * DEBT_PAGE_SIZE,
  );

  const overview = useMemo(() => calculateDebtOverview(debts), [debts]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Debt Management</h1>
          <p className="text-muted-foreground">
            Manage money you borrowed and money you lent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RecentPaymentsDialog
            payments={recentPayments}
            isLoading={isLoading}
            error={error}
          />
          <AddDebtDialog onAdd={handleAddDebt} />
        </div>
      </div>

      <DebtSummary
        overview={overview}
        isLoading={isLoading}
        hasError={Boolean(error)}
      />

      <DebtDashboardOverview
        overview={overview}
        isLoading={isLoading}
        error={error}
      />

      <section className="min-w-0 space-y-4">
        {actionError && <FieldError>{actionError}</FieldError>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={filter}
            onValueChange={(value) => {
              if (value) {
                setFilter(value as DebtFilter);
                setDebtPage(1);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All debts</TabsTrigger>
              <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
              <TabsTrigger value="lent">Lent</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setDebtPage(1);
            }}
            placeholder="Search people or descriptions..."
            aria-label="Search debts"
            className="sm:max-w-xs"
          />
        </div>

        {error ? (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <FieldError>{error}</FieldError>
            <Button variant="outline" onClick={() => refreshDebts()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Spinner /> Loading debts...
          </div>
        ) : visibleDebts.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>
                {debts.length === 0 ? "No debts yet" : "No matching debts"}
              </EmptyTitle>
              <EmptyDescription>
                {debts.length === 0
                  ? "Add a debt to see your balances here."
                  : "Try changing your search or debt type."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
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
                {paginatedDebts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="max-w-56">
                      <div className="truncate font-medium">
                        {debt.personName}
                      </div>
                      {debt.description && (
                        <div className="truncate text-xs text-muted-foreground">
                          {debt.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{debt.type}</TableCell>
                    <TableCell>{formatDate(debt.borrowedDate)}</TableCell>
                    <TableCell>{formatDate(debt.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(debt.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(debt.paidAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(debt.remainingAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-24 flex-col gap-1">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {calculateDebtProgress(debt).toFixed(1)}%
                        </span>
                        <Progress
                          value={calculateDebtProgress(debt)}
                          aria-label={`${debt.personName} repayment progress`}
                          className="gap-0"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          debt.status === "overdue"
                            ? "destructive"
                            : debt.status === "paid"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {statusLabels[debt.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {debt.remainingAmount > 0 && (
                          <RecordPaymentDialog
                            debt={debt}
                            onPayment={handleRecordPayment}
                          />
                        )}
                        <DebtPaymentHistoryDialog
                          debt={debt}
                          onChanged={() => refreshDebts(false)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Edit debt"
                          onClick={() => startEditing(debt)}
                        >
                          <Pencil data-icon="inline-start" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          aria-label="Delete debt"
                          onClick={() => setDeleteTarget(debt)}
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
        )}
        {!error && !isLoading && visibleDebts.length > 0 && (
          <TablePagination
            page={currentDebtPage}
            totalPages={debtTotalPages}
            totalItems={visibleDebts.length}
            pageSize={DEBT_PAGE_SIZE}
            itemLabel="debts"
            onPageChange={setDebtPage}
          />
        )}
      </section>

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
            <DialogTitle>Edit debt</DialogTitle>
            <DialogDescription>
              Update the details for {editing?.personName}.
            </DialogDescription>
          </DialogHeader>
          {editing && editForm && (
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <FieldGroup className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`debt-person-${editing.id}`}>
                    Person
                  </FieldLabel>
                  <Input
                    id={`debt-person-${editing.id}`}
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
                  <FieldLabel htmlFor={`debt-type-${editing.id}`}>
                    Type
                  </FieldLabel>
                  <select
                    id={`debt-type-${editing.id}`}
                    value={editForm.type}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        type: event.target.value as DebtType,
                      })
                    }
                    className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="borrowed">Borrowed</option>
                    <option value="lent">Lent</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`debt-amount-${editing.id}`}>
                    Amount (MMK)
                  </FieldLabel>
                  <Input
                    id={`debt-amount-${editing.id}`}
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
                  <FieldLabel htmlFor={`debt-interest-${editing.id}`}>
                    Interest rate (%)
                  </FieldLabel>
                  <Input
                    id={`debt-interest-${editing.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editForm.interestRate}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        interestRate: Number(event.target.value),
                      })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`debt-start-${editing.id}`}>
                    Start date
                  </FieldLabel>
                  <Input
                    id={`debt-start-${editing.id}`}
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
                  <FieldLabel htmlFor={`debt-due-${editing.id}`}>
                    Due date
                  </FieldLabel>
                  <Input
                    id={`debt-due-${editing.id}`}
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
                  <FieldLabel htmlFor={`debt-description-${editing.id}`}>
                    Description
                  </FieldLabel>
                  <Input
                    id={`debt-description-${editing.id}`}
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
            <AlertDialogTitle>Delete this debt?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the debt with{" "}
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
              {isSaving ? "Deleting..." : "Delete debt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
