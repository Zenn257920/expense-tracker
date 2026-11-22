"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import Input from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      // The reset link points at /reset-password; Better Auth appends
      // the token when it redirects there from the email link.
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not send the reset link.");
        return;
      }
      setIsSent(true);
      toast.success("Reset link sent. Check your email.");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <Link href="/" className="text-sm font-semibold text-primary">
            MyFinance
          </Link>
          <CardTitle className="pt-4 text-2xl">Forgot password?</CardTitle>
          <CardDescription>
            {isSent
              ? `If an account exists for ${email.trim()}, a password reset link is on its way.`
              : "Enter your account email and we will send you a link to choose a new password."}
            <span className="block">
              အကောင့်အီးမေးလ်ကို ရိုက်ထည့်ပါ — စကားဝှက်အသစ်ရွေးဖို့ လင့်ခ်ပို့ပေးပါမယ်။
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <p className="text-sm text-muted-foreground">
              The link expires in 1 hour. Didn&apos;t get the email? Check
              your spam folder, or try again.
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </Field>
              </FieldGroup>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting ? "Please wait..." : "Send reset link"}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
