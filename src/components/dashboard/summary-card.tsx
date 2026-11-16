import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface SummaryCardProps {
  title: string;
  amount: string;
  description: string;
  icon: "balance" | "income" | "expenses";
  color: string;
}

export default function SummaryCard({
  title,
  amount,
  description,
  icon,
  color,
}: SummaryCardProps) {
  const Icon =
    icon === "income" ? TrendingUp : icon === "expenses" ? TrendingDown : Wallet;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-900/60 p-5 shadow-lg shadow-black/10 transition-colors hover:border-white/15 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <span className={`rounded-xl bg-white/5 p-2.5 ${color}`}>
          <Icon size={19} />
        </span>
      </div>

      <h2 className="mt-5 break-words text-xl font-bold tracking-tight text-white sm:text-2xl">
        {amount}
      </h2>

      <p className="mt-2 text-xs text-zinc-500">{description}</p>
    </div>
  );
}
