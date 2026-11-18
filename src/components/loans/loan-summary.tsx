import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneySuffix } from "@/lib/format";
import type { LoanOverview } from "@/lib/loan-analytics";

interface LoanSummaryProps {
  overview: LoanOverview;
  isLoading: boolean;
  hasError: boolean;
}

export default function LoanSummary({ overview, isLoading, hasError }: LoanSummaryProps) {
  const cards = [
    { title: "Total Borrowed", amount: overview.borrowedTotal, icon: ArrowDownLeft, color: "text-red-500" },
    { title: "Total Lent", amount: overview.lentTotal, icon: ArrowUpRight, color: "text-green-500" },
    { title: "Upcoming Payments", amount: overview.upcomingTotal, icon: CalendarClock, color: "text-blue-500" },
    { title: "Overdue Loans", amount: overview.overdueTotal, icon: AlertCircle, color: "text-orange-500" },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon aria-hidden="true" className={`size-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <p className="break-words text-2xl font-bold tabular-nums">
              {isLoading ? "Loading..." : hasError ? "Unavailable" : formatMoneySuffix(card.amount)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
