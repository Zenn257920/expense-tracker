import type { Category, TransactionType } from "@/types/dashboard";

export interface ParsedVoiceTransaction {
  amount: number | null;
  type: TransactionType | null;
  categoryId: string | null;
  categoryName: string | null;
  description: string;
  transactionDate: string;
}

interface CategoryRule {
  name: string;
  type: TransactionType;
  keywords: string[];
  aliases: string[];
}

const categoryRules: CategoryRule[] = [
  {
    name: "Food",
    type: "expense",
    keywords: [
      "lunch",
      "dinner",
      "breakfast",
      "food",
      "coffee",
      "tea",
      "restaurant",
    ],
    aliases: ["food", "foods", "meal", "meals", "dining", "restaurant"],
  },
  {
    name: "Transport",
    type: "expense",
    keywords: ["taxi", "bus", "fuel", "petrol", "transportation"],
    aliases: ["transport", "transportation", "travel", "commute"],
  },
  {
    name: "Shopping",
    type: "expense",
    keywords: ["shopping", "clothes", "clothing"],
    aliases: ["shopping", "clothes", "clothing"],
  },
  {
    name: "Bills",
    type: "expense",
    keywords: ["internet", "electricity", "phone bill", "water bill"],
    aliases: ["bill", "bills", "utilities", "utility"],
  },
  {
    name: "Health",
    type: "expense",
    keywords: ["medicine", "doctor", "hospital"],
    aliases: ["health", "medical", "medicine"],
  },
  {
    name: "Entertainment",
    type: "expense",
    keywords: ["movie", "game", "entertainment"],
    aliases: ["entertainment", "movies", "games", "leisure"],
  },
  {
    name: "Salary",
    type: "income",
    keywords: ["salary", "monthly salary"],
    aliases: ["salary", "wages", "paycheck"],
  },
];

const expenseKeywords = [
  "spent",
  "bought",
  "paid",
  "purchase",
  "purchased",
  "expense",
];
const incomeKeywords = ["received", "salary", "earned", "income", "got money"];
const amountPattern =
  /\b(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(thousand|k)?\b/gi;

function includesPhrase(text: string, phrase: string) {
  const escapedPhrase = phrase
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(`\\b${escapedPhrase}\\b`, "i").test(text);
}

function matchesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => includesPhrase(text, keyword));
}

function parseAmount(text: string) {
  const matches = Array.from(text.matchAll(amountPattern));
  if (matches.length !== 1) return null;

  const match = matches[0];
  const numericText = match[1].replaceAll(",", "");
  const amount = Number(numericText);
  const multiplier = match[3]?.toLowerCase();
  const total = multiplier ? amount * 1000 : amount;

  if (!Number.isFinite(total) || total <= 0 || total > 9_999_999_999.99) {
    return null;
  }

  return total;
}

function getTransactionDate(text: string, now: Date) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (includesPhrase(text, "day before yesterday")) {
    date.setDate(date.getDate() - 2);
  } else if (includesPhrase(text, "yesterday")) {
    date.setDate(date.getDate() - 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findMentionedCategory(text: string, categories: Category[]) {
  const matches = categories.filter((category) =>
    includesPhrase(text, category.name),
  );
  return matches.length === 1 ? matches[0] : null;
}

function findCategoryRule(text: string) {
  const matches = categoryRules.filter((rule) =>
    matchesAny(text, rule.keywords),
  );
  return matches.length === 1 ? matches[0] : null;
}

function findExistingCategory(
  rule: CategoryRule,
  categories: Category[],
  type: TransactionType,
) {
  const aliases = [rule.name, ...rule.aliases].map((alias) =>
    alias.toLocaleLowerCase(),
  );
  return (
    categories.find(
      (category) =>
        category.type === type &&
        aliases.includes(category.name.trim().toLocaleLowerCase()),
    ) ?? null
  );
}

function extractDescription(text: string) {
  const amountMatches = Array.from(text.matchAll(amountPattern));
  let description = text;

  for (const match of amountMatches.reverse()) {
    const start = match.index ?? 0;
    description = `${description.slice(0, start)} ${description.slice(
      start + match[0].length,
    )}`;
  }

  description = description
    .replace(/\bday before yesterday\b/gi, " ")
    .replace(/\b(today|yesterday)\b/gi, " ")
    .replace(/\b(kyats?|mmk|myanmar kyats?)\b/gi, " ")
    .replace(
      /\b(i|we|my|a|an|the|spent|bought|paid|purchase|purchased|expense|received|earned|income|got money|for|on|at|from|and)\b/gi,
      " ",
    )
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!description) return "";

  return description
    .split(" ")
    .map((word) => `${word[0].toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ")
    .slice(0, 500);
}

export function parseVoiceTransaction(
  transcript: string,
  categories: Category[] = [],
  now = new Date(),
): ParsedVoiceTransaction {
  const normalizedText = transcript.trim();
  const hasExpenseKeyword = matchesAny(normalizedText, expenseKeywords);
  const hasIncomeKeyword = matchesAny(normalizedText, incomeKeywords);
  const hasConflictingTypes = hasExpenseKeyword && hasIncomeKeyword;
  const mentionedCategory = findMentionedCategory(
    normalizedText,
    categories,
  );
  const categoryRule = findCategoryRule(normalizedText);

  let type: TransactionType | null = hasConflictingTypes
    ? null
    : hasExpenseKeyword
      ? "expense"
      : hasIncomeKeyword
        ? "income"
        : null;

  if (!type && !hasConflictingTypes) {
    type = mentionedCategory?.type ?? categoryRule?.type ?? null;
  }

  const mentionedCategoryRule = mentionedCategory
    ? categoryRules.find(
      (rule) =>
        rule.type === mentionedCategory.type &&
        [rule.name, ...rule.aliases].some(
          (alias) =>
            alias.toLocaleLowerCase() ===
            mentionedCategory.name.trim().toLocaleLowerCase(),
        ),
    )
    : undefined;
  const matchedRule = mentionedCategoryRule ?? categoryRule;

  const isCategoryTypeCompatible =
    !type || !matchedRule || matchedRule.type === type;
  const resolvedType =
    type ?? (isCategoryTypeCompatible ? mentionedCategory?.type ?? null : null);
  const category =
    !hasConflictingTypes && isCategoryTypeCompatible && resolvedType
      ? mentionedCategory?.type === resolvedType
        ? mentionedCategory
        : matchedRule
          ? findExistingCategory(matchedRule, categories, resolvedType)
          : null
      : null;
  const categoryName = isCategoryTypeCompatible
    ? category?.name ?? matchedRule?.name ?? null
    : null;

  return {
    amount: parseAmount(normalizedText),
    type: resolvedType,
    categoryId: category?.id ?? null,
    categoryName,
    description: extractDescription(normalizedText),
    transactionDate: getTransactionDate(normalizedText, now),
  };
}
