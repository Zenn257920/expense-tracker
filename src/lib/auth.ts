import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { ensureDefaultCategories } from "@/lib/services/category-service";

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
  emailAndPassword: { enabled: true, autoSignIn: false },
  databaseHooks: {
    user: {
      create: {
        // New accounts start with starter categories (Food, Transport,
        // Salary, ...) so the first transaction can be added right away.
        // Seeding must never block signup, so failures are only logged.
        after: async (user) => {
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
