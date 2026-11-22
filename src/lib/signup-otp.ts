import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { verification } from "@/db/schema";
import { ApiError } from "@/lib/api-error";

/**
 * Email OTP that must be verified BEFORE an account can be created.
 *
 * Why not Better Auth's emailOTP plugin? Its send/verify endpoints only
 * work for users that already exist (they throw USER_NOT_FOUND otherwise),
 * so they cannot gate sign-up. This module stores codes in the same
 * `verification` table Better Auth uses, with the code itself only ever
 * stored as a SHA-256 hash.
 *
 * Flow: requestSignupOtp() -> code emailed -> verifySignupOtp() ->
 * a short-lived "verified" marker -> auth's user.create.before hook
 * refuses sign-up while the marker is missing or expired.
 */

export const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // codes are valid for 10 minutes
const VERIFIED_TTL_MS = 15 * 60 * 1000; // verified marker lasts 15 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const OTP_IDENTIFIER = (email: string) => `signup-otp:${email}`;
const VERIFIED_IDENTIFIER = (email: string) => `signup-verified:${email}`;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateOtp() {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

export function hashOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

function hashMatches(otp: string, hash: string) {
  const candidate = Buffer.from(hashOtp(otp));
  const expected = Buffer.from(hash);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

async function findRow(identifier: string) {
  const [row] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, identifier))
    .limit(1);
  return row ?? null;
}

async function deleteRows(identifier: string) {
  await db.delete(verification).where(eq(verification.identifier, identifier));
}

/** Generate + store a code. Returns the plain code so the caller can email it. */
export async function requestSignupOtp(email: string) {
  const normalized = normalizeEmail(email);
  const identifier = OTP_IDENTIFIER(normalized);
  const existing = await findRow(identifier);

  if (existing && existing.expiresAt.getTime() > Date.now()) {
    const createdAt = existing.createdAt?.getTime() ?? 0;
    if (Date.now() - createdAt < RESEND_COOLDOWN_MS) {
      throw new ApiError("Please wait a minute before requesting a new code.", 429);
    }
  }

  const otp = generateOtp();
  await deleteRows(identifier);
  await db.insert(verification).values({
    id: randomUUID(),
    identifier,
    value: `${hashOtp(otp)}:0`,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  return otp;
}

/** Check a code. On success, stores the "verified" marker. */
export async function verifySignupOtp(email: string, otp: string) {
  const normalized = normalizeEmail(email);
  const identifier = OTP_IDENTIFIER(normalized);
  const row = await findRow(identifier);

  if (!row) {
    throw new ApiError("No code was sent to this email. Please request a new code.", 400);
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    await deleteRows(identifier);
    throw new ApiError("This code has expired. Please request a new code.", 400);
  }

  const [hash = "", attemptsText = "0"] = row.value.split(":");
  const attempts = Number.parseInt(attemptsText, 10) || 0;
  if (attempts >= MAX_ATTEMPTS) {
    await deleteRows(identifier);
    throw new ApiError("Too many wrong attempts. Please request a new code.", 429);
  }
  if (!hashMatches(otp.trim(), hash)) {
    await db
      .update(verification)
      .set({ value: `${hash}:${attempts + 1}` })
      .where(and(eq(verification.identifier, identifier), eq(verification.id, row.id)));
    throw new ApiError("Incorrect code. Please try again.", 400);
  }

  await deleteRows(identifier);
  const verifiedIdentifier = VERIFIED_IDENTIFIER(normalized);
  await deleteRows(verifiedIdentifier);
  await db.insert(verification).values({
    id: randomUUID(),
    identifier: verifiedIdentifier,
    value: "verified",
    expiresAt: new Date(Date.now() + VERIFIED_TTL_MS),
  });
}

/** True when this email passed OTP verification recently. */
export async function isSignupVerified(email: string) {
  const row = await findRow(VERIFIED_IDENTIFIER(normalizeEmail(email)));
  return Boolean(row && row.expiresAt.getTime() > Date.now());
}

/** Remove the verified marker (called after the account is created). */
export async function consumeSignupVerification(email: string) {
  await deleteRows(VERIFIED_IDENTIFIER(normalizeEmail(email)));
}
