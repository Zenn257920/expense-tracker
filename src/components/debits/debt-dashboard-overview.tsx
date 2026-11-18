import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, formatMoney } from "@/lib/format";
import type { DebtOverview } from "@/lib/debt-analytics";

interface DebtDashboardOverviewProps {
  overview: DebtOverview;
  isLoading: boolean;
  error: string | null;
}

export default function DebtDashboardOverview({
  overview,
  isLoading,
  error,
}: DebtDashboardOverviewProps) {
  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Debts due within the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loading /> : error ? <FieldError>Could not load upcoming debts.</FieldError> : overview.upcomingDebts.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No upcoming debts</EmptyTitle>
                  <EmptyDescription>There are no outstanding debts due within 7 days.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y">
                {overview.upcomingDebts.map((debt) => (
                  <li key={debt.id} className="flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{debt.personName}</p>
                      <p className="text-xs text-muted-foreground">Due {formatDate(debt.dueDate)}</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-medium tabular-nums">{formatMoney(debt.remainingAmount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Overdue</CardTitle>
            <CardDescription>Outstanding debts past their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loading /> : error ? <FieldError>Could not load overdue debts.</FieldError> : overview.overdueDebts.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No overdue debts</EmptyTitle>
                  <EmptyDescription>All outstanding debts are within their due dates.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y">
                {overview.overdueDebts.map((debt) => (
                  <li key={debt.id} className="flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{debt.personName}</p>
                      <p className="text-xs text-muted-foreground">Overdue since {formatDate(debt.dueDate)}</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-medium tabular-nums">{formatMoney(debt.remainingAmount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

    </>
  );
}

function Loading() {
  return <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Spinner /> Loading...</div>;
}
