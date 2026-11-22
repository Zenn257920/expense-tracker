/**
 * Run with: npx tsx scripts/verify-signup-otp.ts
 * Checks the pure OTP helpers (code format, hashing, email checks).
 * The database-backed request/verify flow needs DATABASE_URL and a mail
 * sender, so it is covered by the register form instead.
 */
import {
  generateOtp,
  hashOtp,
  isValidEmail,
  normalizeEmail,
} from "@/lib/signup-otp";

interface Case {
  name: string;
  actual: unknown;
  expected: unknown;
}

const codes = new Set(Array.from({ length: 20 }, () => generateOtp()));
const cases: Case[] = [
  {
    name: "generated codes are 6 digits",
    actual: [...codes].every((code) => /^\d{6}$/.test(code)),
    expected: true,
  },
  {
    name: "generated codes are not all the same",
    actual: codes.size > 1,
    expected: true,
  },
  {
    name: "hash is deterministic and 64 hex chars",
    actual: hashOtp("123456") === hashOtp("123456") && /^[0-9a-f]{64}$/.test(hashOtp("123456")),
    expected: true,
  },
  {
    name: "different codes hash differently",
    actual: hashOtp("123456") !== hashOtp("123457"),
    expected: true,
  },
  {
    name: "email is lowercased and trimmed",
    actual: normalizeEmail("  Kaung@Example.COM "),
    expected: "kaung@example.com",
  },
  {
    name: "valid email passes",
    actual: isValidEmail("kaung@example.com"),
    expected: true,
  },
  {
    name: "plain text without @ fails",
    actual: isValidEmail("not-an-email"),
    expected: false,
  },
  {
    name: "email without a domain dot fails",
    actual: isValidEmail("kaung@localhost"),
    expected: false,
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
    ? `\n${cases.length}/${cases.length} signup OTP checks passed.`
    : `\n${failures} of ${cases.length} checks failed.`,
);
process.exit(failures === 0 ? 0 : 1);
