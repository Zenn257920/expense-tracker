/**
 * Run with: npx tsx scripts/verify-yangon-date.ts
 * Checks the Yangon date helpers and grouped number formatting.
 * No test framework is installed in this repo, so this script is the check.
 */
import { formatAmount } from "@/lib/format";
import {
  getYangonDateString,
  getYangonParts,
  toDateString,
} from "@/lib/yangon-date";

interface Case {
  name: string;
  actual: unknown;
  expected: unknown;
}

const cases: Case[] = [
  {
    // 2026-10-31 18:00 UTC = 2026-11-01 00:30 in Yangon: UTC math would
    // still say 31 Oct, Yangon math must say 1 Nov.
    name: "00:30 Yangon on 1 Nov is 1 Nov, not 31 Oct (UTC)",
    actual: getYangonDateString(new Date("2026-10-31T18:00:00Z")),
    expected: "2026-11-01",
  },
  {
    name: "Yangon parts for 2026-11-01 00:30 local",
    actual: getYangonParts(new Date("2026-10-31T18:00:00Z")),
    expected: { year: 2026, month: 10, day: 1 },
  },
  {
    name: "midday UTC stays the same Yangon date",
    actual: getYangonDateString(new Date("2026-11-21T06:00:00Z")),
    expected: "2026-11-21",
  },
  {
    name: "toDateString rolls day 32 into next month",
    actual: toDateString(2026, 0, 32),
    expected: "2026-02-01",
  },
  {
    name: "toDateString rolls month 12 into next year",
    actual: toDateString(2026, 12, 1),
    expected: "2027-01-01",
  },
  {
    name: "1,250,000 groups with commas",
    actual: formatAmount(1250000),
    expected: "1,250,000",
  },
  {
    name: "small amounts are unchanged",
    actual: formatAmount(5000),
    expected: "5,000",
  },
];

let failures = 0;
for (const { name, actual, expected } of cases) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) {
    failures += 1;
    console.log(`        expected: ${JSON.stringify(expected)}`);
    console.log(`        actual:   ${JSON.stringify(actual)}`);
  }
}

console.log(
  failures === 0
    ? `\n${cases.length}/${cases.length} Yangon date + formatting checks passed.`
    : `\n${failures} of ${cases.length} checks failed.`,
);
process.exit(failures === 0 ? 0 : 1);
