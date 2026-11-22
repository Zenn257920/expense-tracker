import { getAuthSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";
import { sendSignupOtpEmail } from "@/lib/email";
import { requestSignupOtp } from "@/lib/signup-otp";

/**
 * POST /api/auth/send-my-email-otp
 * Signed-in users only. Sends a 6-digit code to the account's own email,
 * for accounts created before OTP sign-up existed. Reuses the same OTP
 * store as sign-up (see signup-otp).
 */
export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const otp = await requestSignupOtp(session.user.email);
    await sendSignupOtpEmail(session.user.email, otp);
    return Response.json({ success: true, message: "Verification code sent." });
  } catch (error) {
    return apiErrorResponse(error, "Could not send the verification code.");
  }
}
