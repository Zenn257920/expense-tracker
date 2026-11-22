import { apiErrorResponse, readJson, ApiError } from "@/lib/api-error";
import {
  isValidEmail,
  normalizeEmail,
  verifySignupOtp,
} from "@/lib/signup-otp";

/**
 * POST /api/auth/verify-signup-otp { email, otp }
 * Public endpoint used by the register form. On success the email is
 * marked verified for 15 minutes, during which sign-up is allowed.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    if (!isValidEmail(email)) {
      throw new ApiError("Enter a valid email address.", 400);
    }
    if (!/^\d{6}$/.test(otp)) {
      throw new ApiError("Enter the 6-digit code.", 400);
    }

    await verifySignupOtp(email, otp);
    return Response.json({ success: true, message: "Email verified." });
  } catch (error) {
    return apiErrorResponse(error, "Could not verify the code.");
  }
}
