import type { Category, TransactionType } from "@/types/dashboard";

export interface ParsedVoiceTransaction {
  amount: number | null;
  type: TransactionType | null;
  categoryId: string | null;
  categoryName: string | null;
  description: string;
  transactionDate: string;
  /** "high" when amount + type + category were all identified. */
  confidence: "high" | "medium" | "low";
  /** Fields the user still needs to fill in manually before saving. */
  missingFields: Array<"amount" | "type" | "category" | "description">;
  /** True when the transcript contained more than one number. */
  amountAmbiguous: boolean;
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
      "groceries",
      "grocery",
      // Burmese
      "နေ့လည်စာ",
      "မနက်စာ",
      "ညစာ",
      "အစားအသောက်",
      "ကော်ဖီ",
      "လက်ဖက်ရည်",
      "မုန့်",
      "ထမင်း",
      "စားသုံး",
    ],
    aliases: [
      "food",
      "foods",
      "meal",
      "meals",
      "dining",
      "restaurant",
      "အစားအသောက်",
      "စားသုံး",
    ],
  },
  {
    name: "Transport",
    type: "expense",
    keywords: [
      "taxi",
      "bus",
      "fuel",
      "petrol",
      "transportation",
      "တက္ကစီ",
      "ဘတ်စ်",
      "ကား",
      "ဆီ",
      "လောင်စာ",
      "သွားလာရေး",
      "ယာဉ်",
    ],
    aliases: ["transport", "transportation", "travel", "commute", "သွားလာရေး"],
  },
  {
    name: "Shopping",
    type: "expense",
    keywords: [
      "shopping",
      "clothes",
      "clothing",
      "ဈေးဝယ်",
      "အဝတ်အစား",
      "ဈေး",
    ],
    aliases: ["shopping", "clothes", "clothing", "ဈေးဝယ်", "အဝတ်အစား"],
  },
  {
    name: "Groceries",
    type: "expense",
    keywords: ["grocery", "groceries", "market", "ဈေး", "ကုန်စုံ"],
    aliases: ["grocery", "groceries", "market", "ကုန်စုံ"],
  },
  {
    name: "Bills",
    type: "expense",
    keywords: [
      "internet",
      "electricity",
      "phone bill",
      "water bill",
      "ဘေလ်",
      "အင်တာနက်",
      "လျှပ်စစ်",
      "မီတာ",
      "ဖုန်းဘေလ်",
      "ရေဘေလ်",
    ],
    aliases: ["bill", "bills", "utilities", "utility", "ဘေလ်"],
  },
  {
    name: "Rent",
    type: "expense",
    keywords: ["rent", "house rent", "room rent", "အိမ်လခ", "အခန်းလခ"],
    aliases: ["rent", "အိမ်လခ"],
  },
  {
    name: "Health",
    type: "expense",
    keywords: [
      "medicine",
      "doctor",
      "hospital",
      "ဆေးဝါး",
      "ဆေး",
      "ဆရာဝန်",
      "ဆေးရုံ",
      "ကျန်းမာရေး",
    ],
    aliases: ["health", "medical", "medicine", "ကျန်းမာရေး"],
  },
  {
    name: "Entertainment",
    type: "expense",
    keywords: [
      "movie",
      "game",
      "entertainment",
      "ရုပ်ရှင်",
      "ဂိမ်း",
      "ဖျော်ဖြေရေး",
    ],
    aliases: ["entertainment", "movies", "games", "leisure", "ဖျော်ဖြေရေး"],
  },
  {
    name: "Salary",
    type: "income",
    keywords: ["salary", "monthly salary", "လစာ", "လုပ်ခ", "လုပ်အားခ"],
    aliases: ["salary", "wages", "paycheck", "လစာ"],
  },
];

const expenseKeywords = [
  "spent",
  "bought",
  "paid",
  "purchase",
  "purchased",
  "expense",
  "သုံးတယ်",
  "သုံးလိုက်",
  "ပေးတယ်",
  "ပေးလိုက်",
  "ဝယ်တယ်",
  "ဝယ်လိုက်",
  "စားတယ်",
  "ကုန်တယ်",
  "ထုတ်တယ်",
];
const incomeKeywords = [
  "received",
  "salary",
  "earned",
  "income",
  "got money",
  "ရတယ်",
  "ရလိုက်",
  "ဝင်တယ်",
  "ဝင်ငွေ",
  "လက်ခံတယ်",
  "လစာ",
];

const BURMESE_DIGITS: Record<string, string> = {
  "၀": "0",
  "၁": "1",
  "၂": "2",
  "၃": "3",
  "၄": "4",
  "၅": "5",
  "၆": "6",
  "၇": "7",
  "၈": "8",
  "၉": "9",
};

const ENGLISH_NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const BURMESE_NUMBER_WORDS: Record<string, number> = {
  တစ်: 1,
  နှစ်: 2,
  သုံး: 3,
  လေး: 4,
  ငါး: 5,
  ခြောက်: 6,
  ခုနစ်: 7,
  ရှစ်: 8,
  ကိုး: 9,
  ဆယ်: 10,
  နှစ်ဆယ်: 20,
  သုံးဆယ်: 30,
  လေးဆယ်: 40,
  ငါးဆယ်: 50,
  ခြောက်ဆယ်: 60,
  ခုနစ်ဆယ်: 70,
  ရှစ်ဆယ်: 80,
  ကိုးဆယ်: 90,
};

/** thousand / lakh-style multipliers, in kyat. */
const MULTIPLIERS: Record<string, number> = {
  thousand: 1000,
  k: 1000,
  hundred: 100,
  ထောင်: 1000,
  သောင်း: 10000,
  သိန်း: 100000,
  သန်း: 10000000,
  ရာ: 100,
};

const UNIT_WORDS = ["kyat", "kyats", "mmk", "ကျပ်"];

/**
 * Detect the voice language from the transcript itself. Myanmar script
 * (U+1000–U+109F) means Burmese; anything else defaults to English.
 */
export function detectVoiceLanguage(transcript: string): "my-MM" | "en-US" {
  return /[\u1000-\u109F]/.test(transcript) ? "my-MM" : "en-US";
}

function normalizeDigits(text: string) {
  return text.replace(/[၀-၉]/g, (digit) => BURMESE_DIGITS[digit] ?? digit);
}

/**
 * `\b` is ASCII-only, so it never matches Burmese word boundaries.
 * Use Unicode letter/number boundaries instead, so both English and
 * Burmese phrases match.
 */
function includesPhrase(text: string, phrase: string) {
  const escapedPhrase = phrase
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapedPhrase}([^\\p{L}\\p{N}]|$)`,
    "iu",
  ).test(text);
}

function matchesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => includesPhrase(text, keyword));
}

interface AmountCandidate {
  value: number;
  hasUnit: boolean;
  index: number;
}

/**
 * Find every number-like token in the transcript, including:
 * - digits, incl. Burmese digits (၅၀၀၀) and commas (15,000)
 * - English number words ("five thousand", "fifteen thousand")
 * - Burmese number words ("ငါးထောင်" = 5,000, "တစ်သိန်း" = 100,000)
 * - multipliers / currency units (k, thousand, ထောင်, သောင်း, သိန်း, ကျပ်)
 */
function findAmountCandidates(text: string): AmountCandidate[] {
  const normalized = normalizeDigits(text);
  const numberWordPattern = [
    ...Object.keys(ENGLISH_NUMBER_WORDS),
    ...Object.keys(BURMESE_NUMBER_WORDS).sort((a, b) => b.length - a.length),
  ].join("|");
  const multiplierPattern = [
    ...Object.keys(MULTIPLIERS),
    ...UNIT_WORDS,
  ]
    .sort((a, b) => b.length - a.length)
    .join("|");
  const pattern = new RegExp(
    `(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d{1,2})?|${numberWordPattern})\\s*(${multiplierPattern})?`,
    "giu",
  );

  const candidates: AmountCandidate[] = [];
  for (const match of normalized.matchAll(pattern)) {
    const rawNumber = match[1];
    const suffix = match[2]?.toLowerCase();
    // A bare number word with no multiplier/unit is usually a verb, not
    // an amount — e.g. "သုံး" in "သုံးတယ်" (spent). Digits are always
    // amounts; word numbers need a multiplier ("five thousand",
    // "ငါးထောင်") to count.
    if (!/^\d/.test(rawNumber) && !suffix) continue;
    let base: number;
    if (/^\d/.test(rawNumber)) {
      base = Number(rawNumber.replaceAll(",", ""));
    } else {
      const lower = rawNumber.toLowerCase();
      base =
        ENGLISH_NUMBER_WORDS[lower] ?? BURMESE_NUMBER_WORDS[rawNumber] ?? NaN;
    }
    if (!Number.isFinite(base)) continue;

    const multiplier = suffix ? (MULTIPLIERS[suffix] ?? 1) : 1;
    const value = base * multiplier;
    if (!Number.isFinite(value) || value <= 0 || value > 9_999_999_999.99) {
      continue;
    }
    candidates.push({
      value,
      hasUnit: Boolean(suffix),
      index: match.index ?? 0,
    });
  }
  return candidates;
}

function parseAmount(text: string): {
  amount: number | null;
  ambiguous: boolean;
} {
  const candidates = findAmountCandidates(text);
  if (candidates.length === 0) return { amount: null, ambiguous: false };
  if (candidates.length === 1) {
    return { amount: candidates[0].value, ambiguous: false };
  }

  const withUnit = candidates.filter((candidate) => candidate.hasUnit);
  if (withUnit.length === 1) {
    return { amount: withUnit[0].value, ambiguous: true };
  }
  if (withUnit.length > 1) {
    // e.g. "5 thousand for lunch and 2 thousand for taxi" — take the
    // first unit-marked amount and let the user correct it in the form.
    return { amount: withUnit[0].value, ambiguous: true };
  }

  // No unit anywhere, e.g. "lunch for 2 people, 5000" — the amount is
  // almost always the largest number, not the head-count.
  const largest = Math.max(...candidates.map((c) => c.value));
  return { amount: largest, ambiguous: true };
}

function getTransactionDate(text: string, now: Date) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (includesPhrase(text, "day before yesterday")) {
    date.setDate(date.getDate() - 2);
  } else if (
    includesPhrase(text, "yesterday") ||
    includesPhrase(text, "မနေ့က") ||
    includesPhrase(text, "မနေ့")
  ) {
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
  const normalized = normalizeDigits(text);
  // Remove every amount-like span first, so "5000" never lands in the
  // description, then strip dates / currency / filler verbs.
  const numberWordPattern = [
    ...Object.keys(ENGLISH_NUMBER_WORDS),
    ...Object.keys(BURMESE_NUMBER_WORDS).sort((a, b) => b.length - a.length),
  ].join("|");
  const multiplierPattern = [
    ...Object.keys(MULTIPLIERS),
    ...UNIT_WORDS,
  ]
    .sort((a, b) => b.length - a.length)
    .join("|");
  const amountPattern = new RegExp(
    `(?:\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d{1,2})?|${numberWordPattern})\\s*(?:${multiplierPattern})?`,
    "giu",
  );

  let description = normalized;
  for (const match of Array.from(normalized.matchAll(amountPattern)).reverse()) {
    // Same rule as the amount finder: a bare number word is a verb
    // ("သုံးတယ်"), not an amount — leave it for the verb strip below.
    const isBareWordNumber =
      !/^\d/.test(match[0]) &&
      !new RegExp(`(?:${multiplierPattern})$`, "iu").test(match[0].trim());
    if (isBareWordNumber) continue;
    const start = match.index ?? 0;
    description = `${description.slice(0, start)} ${description.slice(
      start + match[0].length,
    )}`;
  }

  description = description
    .replace(/\bday before yesterday\b/gi, " ")
    .replace(/\b(today|yesterday)\b/gi, " ")
    .replace(/မနေ့က|မနေ့|ဒီနေ့/g, " ")
    .replace(/\b(kyats?|mmk|myanmar kyats?)\b/gi, " ")
    .replace(/ကျပ်/g, " ")
    .replace(
      /\b(i|we|my|a|an|the|spent|bought|paid|purchase|purchased|expense|received|earned|income|got money|for|on|at|from|and)\b/gi,
      " ",
    )
    // Burmese filler verbs / particles — keep the content words (food,
    // coffee, taxi, ...) and drop only the grammar around them.
    .replace(/သုံးတယ်|သုံးလိုက်|ပေးတယ်|ပေးလိုက်|ဝယ်တယ်|ဝယ်လိုက်|ရတယ်|ရလိုက်|ဝင်တယ်|လက်ခံတယ်|စားတယ်|ကုန်တယ်|ထုတ်တယ်/g, " ")
    .replace(/[.,!?;:၊]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!description) return "";

  // Title-case Latin words only; Burmese script is unaffected by case.
  return description
    .split(" ")
    .map((word) =>
      /^[a-z]/i.test(word)
        ? `${word[0].toLocaleUpperCase()}${word.slice(1)}`
        : word,
    )
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

  const { amount, ambiguous } = parseAmount(normalizedText);
  const description = extractDescription(normalizedText);

  const missingFields: ParsedVoiceTransaction["missingFields"] = [];
  if (amount === null) missingFields.push("amount");
  if (resolvedType === null) missingFields.push("type");
  if (!category) missingFields.push("category");
  if (!description) missingFields.push("description");

  const confidence: ParsedVoiceTransaction["confidence"] =
    amount !== null && resolvedType !== null && category
      ? "high"
      : amount !== null && resolvedType !== null
        ? "medium"
        : "low";

  return {
    amount,
    type: resolvedType,
    categoryId: category?.id ?? null,
    categoryName,
    description,
    transactionDate: getTransactionDate(normalizedText, now),
    confidence,
    missingFields,
    amountAmbiguous: ambiguous,
  };
}
