import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import { getAuthSession } from "@/lib/auth-session";
import { apiErrorResponse, readJson, ApiError } from "@/lib/api-error";
import {
  consumeSignupVerification,
  verifySignupOtp,
} from "@/lib/signup-otp";

/**
 * POST /api/auth/verify-my-email { otp }
 * Signed-in users only. Verifies the code sent to the account's own
 * email and marks the email verified.
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const body = await readJson(request);
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    if (!/^\d{6}$/.test(otp)) {
      throw new ApiError("Enter the 6-digit code.", 400);
    }

    await verifySignupOtp(session.user.email, otp);
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, session.user.id));
    await consumeSignupVerification(session.user.email);
    return Response.json({ success: true, message: "Email verified." });
  } catch (error) {
    return apiErrorResponse(error, "Could not verify the code.");
  }
}
