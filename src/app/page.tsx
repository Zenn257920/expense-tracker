import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth-session";

// Reads the session (headers), so this page cannot be prerendered.
export const instant = false;

export default async function Home() {
  const session = await getAuthSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-3xl font-bold">MyFinance</h1>
          <p className="mt-3 text-muted-foreground">
            ဝင်ငွေနဲ့ အသုံးစရိတ်ကို လွယ်လွယ်မှတ်ထားနိုင်တဲ့ ကိုယ်ပိုင်ငွေစာရင်း
            app ပါ။
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your income and expenses in one place.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button render={<Link href="/register" />} className="w-full">
            Create account
          </Button>
          <Button
            variant="outline"
            render={<Link href="/login" />}
            className="w-full"
          >
            Sign in
          </Button>
        </div>
      </div>
    </main>
  );
}
