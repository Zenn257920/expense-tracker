"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
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
import { signInSchema, signUpSchema } from "@/lib/schemas/auth";

type AuthFormProps = { mode: "login" | "register" };

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Register is two steps: details -> OTP code sent to the email -> the
  // account is only created after the code is verified.
  const [step, setStep] = useState<"details" | "otp">("details");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function postOtp(path: string, body: Record<string, string>) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message ?? "Something went wrong. Please try again.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const values = isRegister
      ? signUpSchema.safeParse({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        })
      : signInSchema.safeParse({ email: email.trim(), password });

    if (!values.success) {
      const errors: Record<string, string> = {};
      for (const issue of values.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        // Step 1: send the OTP. The account is created only after the
        // code is verified (see handleOtpSubmit below).
        try {
          await postOtp("/api/auth/send-signup-otp", { email: email.trim() });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not send the code.");
          return;
        }
        setResendIn(60);
        setStep("otp");
        toast.success("Verification code sent. Check your email.");
        return;
      }

      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) {
        setError(
          result.error.message ?? "Could not sign in. Please try again.",
        );
        return;
      }

      toast.success("Signed in successfully.");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      // Step 2: verify the code, then create the account. The server
      // refuses sign-up while the email is not verified.
      await postOtp("/api/auth/verify-signup-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not create your account.");
        return;
      }
      toast.success("Account created successfully. Please sign in.");
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0) return;
    setError("");
    setIsSubmitting(true);
    try {
      await postOtp("/api/auth/send-signup-otp", { email: email.trim() });
      setResendIn(60);
      toast.success("A new code was sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
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
          <CardTitle className="pt-4 text-2xl">
            {isRegister && step === "otp"
              ? "Check your email"
              : isRegister
                ? "Create your account"
                : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isRegister && step === "otp"
              ? `We sent a 6-digit code to ${email.trim()}. Enter it below to verify your email, then your account will be created.`
              : isRegister
                ? "Start managing your personal finances."
                : "Sign in to continue to your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRegister && step === "otp" ? (
            <form
              onSubmit={handleOtpSubmit}
              noValidate
              className="flex flex-col gap-5"
            >
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="auth-otp">Verification code</FieldLabel>
                  <Input
                    id="auth-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replaceAll(/\D/g, "").slice(0, 6))
                    }
                    required
                  />
                </Field>
              </FieldGroup>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting ? "Please wait..." : "Verify & create account"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => {
                    setStep("details");
                    setError("");
                  }}
                >
                  Change email
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting || resendIn > 0}
                  onClick={handleResend}
                >
                  {resendIn > 0 ? `Resend code (${resendIn}s)` : "Resend code"}
                </Button>
              </div>
            </form>
          ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5"
          >
            <FieldGroup className="gap-4">
              {isRegister && (
                <AuthField
                  label="Name"
                  type="text"
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  error={fieldErrors.name}
                />
              )}
              <AuthField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                error={fieldErrors.email}
              />
              <AuthField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={isRegister ? "new-password" : "current-password"}
                error={fieldErrors.password}
              />
              {isRegister && (
                <AuthField
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  error={fieldErrors.confirmPassword}
                />
              )}
            </FieldGroup>
            {error && <FieldError>{error}</FieldError>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting
                ? "Please wait..."
                : isRegister
                  ? "Send verification code"
                  : "Sign in"}
            </Button>
          </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account? " : "New to MyFinance? "}
            <Link
              href={isRegister ? "/login" : "/register"}
              className="font-medium text-primary hover:underline"
            >
              {isRegister ? "Sign in" : "Create account"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function AuthField({
  label,
  type,
  value,
  onChange,
  autoComplete,
  error,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const fieldId = `auth-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <Input
        id={fieldId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        minLength={type === "password" ? 8 : undefined}
        aria-invalid={Boolean(error)}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
