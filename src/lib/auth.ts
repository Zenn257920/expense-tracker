import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendResetPasswordEmail } from "@/lib/email";
import { ensureDefaultCategories } from "@/lib/services/category-service";
import {
  consumeSignupVerification,
  isSignupVerified,
} from "@/lib/signup-otp";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    // Built-in password reset: Better Auth generates the token and the
    // reset link; we only send the email. The link points at
    // /reset-password (see the forgot-password page).
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  databaseHooks: {
    user: {
      create: {
        // No account without a verified email: sign-up is only allowed
        // within 15 minutes after the OTP was verified (see signup-otp).
        // This is a backstop — the register form already verifies the
        // OTP before calling sign-up.
        before: async (user) => {
          if (!(await isSignupVerified(user.email))) {
            throw new APIError("BAD_REQUEST", {
              message: "Please verify your email with the OTP code first.",
            });
          }
        },
        // New accounts start with starter categories (Food, Transport,
        // Salary, ...) so the first transaction can be added right away.
        // Seeding must never block signup, so failures are only logged.
        after: async (user) => {
          try {
            // Creation is only reachable after OTP verification (see the
            // before hook), so the email is verified from day one.
            await db
              .update(schema.user)
              .set({ emailVerified: true })
              .where(eq(schema.user.id, user.id));
          } catch (error) {
            console.error("[mark email verified]", error);
          }
          try {
            await consumeSignupVerification(user.email);
          } catch (error) {
            console.error("[consume signup verification]", error);
          }
          try {
            await ensureDefaultCategories(user.id);
          } catch (error) {
            console.error("[seed default categories]", error);
          }
        },
      },
    },
  },
  onAPIError: {
    onError(error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Better Auth API error]", error);
      }
    },
  },
});
