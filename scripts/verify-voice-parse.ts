/**
 * Run with: npx tsx scripts/verify-voice-parse.ts
 * Checks the voice parser against English + Burmese phrases. No test
 * framework is installed in this repo, so this script is the check.
 */
import { parseVoiceTransaction } from "@/lib/parse-voice-transaction";
import type { Category } from "@/types/dashboard";

const categories: Category[] = [
  { id: "food-1", name: "Food", type: "expense" },
  { id: "transport-1", name: "Transport", type: "expense" },
  { id: "shopping-1", name: "Shopping", type: "expense" },
  { id: "salary-1", name: "Salary", type: "income" },
  { id: "food-mm", name: "အစားအသောက်", type: "expense" },
];

const now = new Date(2026, 10, 21); // 2026-11-21

interface Case {
  input: string;
  amount: number | null;
  type: "income" | "expense" | null;
  categoryId?: string | null;
  date?: string;
  ambiguous?: boolean;
  description?: string;
}

const cases: Case[] = [
  { input: "Spent 5000 on lunch", amount: 5000, type: "expense", categoryId: "food-1" },
  {
    input: "နေ့လည်စာ ငါးထောင် သုံးတယ်",
    amount: 5000,
    type: "expense",
    categoryId: "food-1",
    description: "နေ့လည်စာ",
  },
  {
    input: "တက္ကစီ ၁၀၀၀၀ ပေးတယ် မနေ့က",
    amount: 10000,
    type: "expense",
    categoryId: "transport-1",
    date: "2026-11-20",
  },
  {
    input: "လစာ ငါးသိန်း ရတယ်",
    amount: 500000,
    type: "income",
    categoryId: "salary-1",
  },
  {
    input: "လစာ တစ်သိန်း ရတယ်",
    amount: 100000,
    type: "income",
    categoryId: "salary-1",
  },
  {
    input: "Paid 10000 for taxi yesterday",
    amount: 10000,
    type: "expense",
    categoryId: "transport-1",
    date: "2026-11-20",
  },
  {
    input: "Spent 5000 on lunch day before yesterday",
    amount: 5000,
    type: "expense",
    date: "2026-11-19",
  },
  {
    input: "lunch for 2 people 5000",
    amount: 5000,
    type: "expense",
    categoryId: "food-1",
    ambiguous: true,
  },
  {
    input: "five thousand on coffee",
    amount: 5000,
    type: "expense",
    categoryId: "food-1",
  },
  {
    input: "Spent 15k on shopping",
    amount: 15000,
    type: "expense",
    categoryId: "shopping-1",
  },
  {
    input: "Received 250000 salary",
    amount: 250000,
    type: "income",
    categoryId: "salary-1",
  },
  {
    input: "အစားအသောက် ၅၀၀၀ သုံးတယ်",
    amount: 5000,
    type: "expense",
    categoryId: "food-mm",
    description: "အစားအသောက်",
  },
  // Reported by Kaung 2026-11-21: "ကော်ဖီဖိုးသထောင်" was heard as one
  // compound word — no amount, no category, type stayed Income.
  {
    input: "ကော်ဖီဖိုးသထောင်",
    amount: 1000,
    type: "expense",
    categoryId: "food-1",
    description: "ကော်ဖီဖိုး",
  },
  {
    input: "ကော်ဖီဖိုး တစ်ထောင်",
    amount: 1000,
    type: "expense",
    categoryId: "food-1",
    description: "ကော်ဖီဖိုး",
  },
  {
    input: "ကော်ဖီဖိုး တထောင်",
    amount: 1000,
    type: "expense",
    categoryId: "food-1",
  },
  {
    input: "ကော်ဖီထောင်",
    amount: 1000,
    type: "expense",
    categoryId: "food-1",
  },
  // Reported by Kaung 2026-11-21: amount + type are right, but no category
  // can be guessed from "going out" — the form must offer a generic
  // "+ New category" instead of a suggested one.
  {
    input: "အပြင်သွားတာ တသောင်း ကုန်တယ်",
    amount: 10000,
    type: "expense",
    categoryId: null,
    description: "အပြင်သွားတာ",
  },
];

let failures = 0;
for (const testCase of cases) {
  const result = parseVoiceTransaction(testCase.input, categories, now);
  const problems: string[] = [];
  if (result.amount !== testCase.amount)
    problems.push(`amount ${result.amount} != ${testCase.amount}`);
  if (result.type !== testCase.type)
    problems.push(`type ${result.type} != ${testCase.type}`);
  if (
    testCase.categoryId !== undefined &&
    result.categoryId !== testCase.categoryId
  )
    problems.push(
      `categoryId ${result.categoryId} != ${testCase.categoryId}`,
    );
  if (testCase.date && result.transactionDate !== testCase.date)
    problems.push(`date ${result.transactionDate} != ${testCase.date}`);
  if (
    testCase.ambiguous !== undefined &&
    result.amountAmbiguous !== testCase.ambiguous
  )
    problems.push(
      `ambiguous ${result.amountAmbiguous} != ${testCase.ambiguous}`,
    );
  if (
    testCase.description !== undefined &&
    result.description !== testCase.description
  )
    problems.push(
      `description "${result.description}" != "${testCase.description}"`,
    );

  if (problems.length > 0) {
    failures += 1;
    console.log(`FAIL "${testCase.input}" — ${problems.join("; ")}`);
    console.log(`     got: ${JSON.stringify(result)}`);
  } else {
    console.log(
      `PASS "${testCase.input}" → ${result.amount} ${result.type} ${result.categoryId ?? ""} ${result.transactionDate} "${result.description}"`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} of ${cases.length} voice-parse cases failed.`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} voice-parse cases passed.`);
