import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SummaryTone = "income" | "expense" | "positive" | "negative" | "default";

const toneClasses: Record<SummaryTone, string> = {
  income: "text-green-600 dark:text-green-400",
  expense: "text-red-600 dark:text-red-400",
  positive: "text-green-600 dark:text-green-400",
  negative: "text-red-600 dark:text-red-400",
  default: "",
};

interface SummaryCardProps {
  title: string;
  amount: string;
  description: string;
  icon: "balance" | "income" | "expenses";
  /** Colours the amount: income/positive green, expense/negative red. */
  tone?: SummaryTone;
  children?: ReactNode;
}

export default function SummaryCard({
  title,
  amount,
  description,
  icon,
  tone = "default",
  children,
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
        <p className={`break-words text-2xl font-semibold tracking-tight tabular-nums ${toneClasses[tone]}`}>{amount}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}
