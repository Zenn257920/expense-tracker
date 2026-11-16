import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  amount: string;
  description: string;
  icon: "balance" | "income" | "expenses";
}

export default function SummaryCard({
  title,
  amount,
  description,
  icon,
}: SummaryCardProps) {
  const Icon =
    icon === "income" ? TrendingUp : icon === "expenses" ? TrendingDown : Wallet;

  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <CardAction>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon aria-hidden="true" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="break-words text-2xl font-semibold tracking-tight tabular-nums">{amount}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
