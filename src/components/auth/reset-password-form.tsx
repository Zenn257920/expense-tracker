"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
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

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const linkError = searchParams.get("error");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(
    linkError ? "This reset link is invalid or has expired." : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasToken = token.length > 0 && !linkError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const result = await authClient.resetPassword({
        newPassword,
        token,
      });
      if (result.error) {
        setError(
          result.error.message ??
            "Could not reset your password. The link may have expired.",
        );
        return;
      }
      toast.success("Password reset. Sign in with your new password.");
      router.replace("/login");
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
            Choose a new password
          </CardTitle>
          <CardDescription>
            Pick a new password for your account.
            <span className="block">
              သင့်အကောင့်အတွက် စကားဝှက်အသစ်ကို ရွေးပါ။
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasToken ? (
            <div className="flex flex-col gap-5">
              {error && <FieldError>{error}</FieldError>}
              <Button render={<Link href="/forgot-password" />}>
                Request a new reset link
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5"
            >
              <FieldGroup className="gap-4">
                <ResetPasswordField
                  id="reset-new-password"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  isVisible={showNewPassword}
                  onToggleVisibility={() =>
                    setShowNewPassword((value) => !value)
                  }
                />
                <ResetPasswordField
                  id="reset-confirm-password"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  isVisible={showConfirmPassword}
                  onToggleVisibility={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                />
              </FieldGroup>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting ? "Please wait..." : "Reset password"}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function ResetPasswordField({
  id,
  label,
  value,
  onChange,
  isVisible,
  onToggleVisibility,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={onToggleVisibility}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        At least 8 characters
      </p>
    </Field>
  );
}
