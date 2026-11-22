"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoneySuffix } from "@/lib/format";
import type { LoanOverview } from "@/lib/loan-analytics";
import type { Loan } from "@/types/loan";

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
  // The lists are collapsed behind a tap: their totals are visible in the
  // headers, so the loan list below stays near the top of the page.
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [overdueOpen, setOverdueOpen] = useState(false);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <OverviewCard
        title="Upcoming"
        description="Loans due within the next 7 days"
        loans={overview.upcomingLoans}
        total={overview.upcomingTotal}
        dateLabel="Due"
        isLoading={isLoading}
        error={error}
        isOpen={upcomingOpen}
        onToggle={() => setUpcomingOpen((open) => !open)}
        emptyTitle="No upcoming loans"
        emptyDescription="There are no outstanding loans due within 7 days."
        errorMessage="Could not load upcoming loans."
      />
      <OverviewCard
        title="Overdue"
        description="Outstanding loans past their due date"
        loans={overview.overdueLoans}
        total={overview.overdueTotal}
        dateLabel="Overdue since"
        isLoading={isLoading}
        error={error}
        isOpen={overdueOpen}
        onToggle={() => setOverdueOpen((open) => !open)}
        emptyTitle="No overdue loans"
        emptyDescription="All outstanding loans are within their due dates."
        errorMessage="Could not load overdue loans."
      />
    </div>
  );
}

interface OverviewCardProps {
  title: string;
  description: string;
  loans: Loan[];
  total: number;
  dateLabel: string;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  onToggle: () => void;
  emptyTitle: string;
  emptyDescription: string;
  errorMessage: string;
}

function OverviewCard({
  title,
  description,
  loans,
  total,
  dateLabel,
  isLoading,
  error,
  isOpen,
  onToggle,
  emptyTitle,
  emptyDescription,
  errorMessage,
}: OverviewCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-3 px-6 pt-6 pb-2 text-left"
        >
          <span className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
            <p className="mt-1 text-sm font-medium tabular-nums">
              {isLoading
                ? "Loading..."
                : `${loans.length} ${loans.length === 1 ? "loan" : "loans"} · ${formatMoneySuffix(total)}`}
            </p>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </CardHeader>
      {isOpen && (
        <CardContent>
          {isLoading ? <Loading /> : error ? <FieldError>{errorMessage}</FieldError> : loans.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{emptyTitle}</EmptyTitle>
                <EmptyDescription>{emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y">
              {loans.map((loan) => (
                <li key={loan.id} className="flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-medium">{loan.personName}</p>
                      <Badge variant={loan.type === "lent" ? "secondary" : "outline"}>
                        {loan.type === "lent" ? "Lent" : "Borrowed"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{dateLabel} {formatDate(loan.dueDate)}</p>
                  </div>
                  <p className="shrink-0 text-right text-sm font-medium tabular-nums">{formatMoneySuffix(loan.remainingAmount)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Loading() {
  return <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Spinner /> Loading...</div>;
}
