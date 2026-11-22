import { apiErrorResponse, readJson, ApiError } from "@/lib/api-error";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendSignupOtpEmail } from "@/lib/email";
import {
  isValidEmail,
  normalizeEmail,
  requestSignupOtp,
} from "@/lib/signup-otp";

/**
 * POST /api/auth/send-signup-otp { email }
 * Public endpoint used by the register form before an account exists.
 * Sends a 6-digit code to the email; the code must be verified before
 * sign-up is allowed (see verify-signup-otp and auth's create hook).
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    if (!isValidEmail(email)) {
      throw new ApiError("Enter a valid email address.", 400);
    }

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existing) {
      throw new ApiError("An account with this email already exists.", 409);
    }

    const otp = await requestSignupOtp(email);
    try {
      await sendSignupOtpEmail(email, otp);
    } catch (error) {
      // Do not leave a code behind that can never arrive.
      console.error("[send-signup-otp] email failed", error);
      throw new ApiError("Could not send the code. Please try again later.", 500);
    }
    return Response.json({ success: true, message: "Verification code sent." });
  } catch (error) {
    return apiErrorResponse(error, "Could not send the verification code.");
  }
}
