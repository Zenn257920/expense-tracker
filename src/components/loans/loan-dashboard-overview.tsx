import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoneySuffix } from "@/lib/format";
import type { LoanOverview } from "@/lib/loan-analytics";

interface LoanDashboardOverviewProps {
  overview: LoanOverview;
  isLoading: boolean;
  error: string | null;
}

export default function LoanDashboardOverview({
  overview,
  isLoading,
  error,
}: LoanDashboardOverviewProps) {
  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Loans due within the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loading /> : error ? <FieldError>Could not load upcoming loans.</FieldError> : overview.upcomingLoans.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No upcoming loans</EmptyTitle>
                  <EmptyDescription>There are no outstanding loans due within 7 days.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y">
                {overview.upcomingLoans.map((loan) => (
                  <li key={loan.id} className="flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-medium">{loan.personName}</p>
                        <Badge variant={loan.type === "lent" ? "secondary" : "outline"}>
                          {loan.type === "lent" ? "Lent" : "Borrowed"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Due {formatDate(loan.dueDate)}</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-medium tabular-nums">{formatMoneySuffix(loan.remainingAmount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Overdue</CardTitle>
            <CardDescription>Outstanding loans past their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loading /> : error ? <FieldError>Could not load overdue loans.</FieldError> : overview.overdueLoans.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No overdue loans</EmptyTitle>
                  <EmptyDescription>All outstanding loans are within their due dates.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y">
                {overview.overdueLoans.map((loan) => (
                  <li key={loan.id} className="flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-medium">{loan.personName}</p>
                        <Badge variant={loan.type === "lent" ? "secondary" : "outline"}>
                          {loan.type === "lent" ? "Lent" : "Borrowed"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Overdue since {formatDate(loan.dueDate)}</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-medium tabular-nums">{formatMoneySuffix(loan.remainingAmount)}</p>
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
