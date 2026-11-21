import type { TransactionType } from "@/types/dashboard";

/**
 * Starter categories every new account gets, and the one-tap set offered
 * on the empty Categories page. Names intentionally match the voice
 * parser's category rules (src/lib/parse-voice-transaction.ts), so a
 * spoken "lunch" or "salary" finds its category from day one.
 */
export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: TransactionType;
}> = [
  { name: "Food", type: "expense" },
  { name: "Transport", type: "expense" },
  { name: "Shopping", type: "expense" },
  { name: "Groceries", type: "expense" },
  { name: "Bills", type: "expense" },
  { name: "Rent", type: "expense" },
  { name: "Health", type: "expense" },
  { name: "Entertainment", type: "expense" },
  { name: "Salary", type: "income" },
];
