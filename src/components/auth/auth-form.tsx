"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <Link href="/" className="text-sm font-semibold text-primary">
            MyFinance
          </Link>
          <CardTitle className="pt-4 text-2xl">
            {isRegister ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Start managing your personal finances."
              : "Sign in to continue to your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
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
