import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoneySuffix } from "@/lib/format";
import type { RecentLoanPayment } from "@/lib/api";

interface LoanRecentPaymentsDialogProps {
  payments: RecentLoanPayment[];
  isLoading: boolean;
  error: string | null;
}

export default function LoanRecentPaymentsDialog({
  payments,
  isLoading,
  error,
}: LoanRecentPaymentsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            <History data-icon="inline-start" />
            Recent payments
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Recent Payments</DialogTitle>
          <DialogDescription>The latest 5 payments across your loans.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner /> Loading recent payments...
          </div>
        ) : error ? (
          <FieldError>Could not load recent payments.</FieldError>
        ) : payments.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No payments yet</EmptyTitle>
              <EmptyDescription>Payments you record will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="min-w-0 divide-y">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="max-w-full truncate font-medium">{payment.personName}</p>
                    <Badge variant="outline" className="capitalize">{payment.type}</Badge>
                  </div>
                  {payment.note && (
                    <p className="mt-1 break-words text-sm text-muted-foreground">{payment.note}</p>
                  )}
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
                  <span className="text-sm text-muted-foreground">{formatDate(payment.paymentDate)}</span>
                  <span className="font-medium tabular-nums">{formatMoneySuffix(payment.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
