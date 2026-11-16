"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

type AuthFormProps = { mode: "login" | "register" };

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = isRegister
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : await authClient.signIn.email({ email: email.trim(), password });

      if (result.error) {
        setError(
          result.error.message ?? "Authentication failed. Please try again.",
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl sm:p-8">
        <Link href="/" className="text-sm font-semibold text-blue-300">
          MyFinance
        </Link>
        <h1 className="mt-6 text-2xl font-bold">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {isRegister
            ? "Start managing your personal finances."
            : "Sign in to continue to your dashboard."}
        </p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {isRegister && (
            <Field
              label="Name"
              type="text"
              value={name}
              onChange={setName}
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          {isRegister && (
            <Field
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-400">
              {error}
            </p>
          )}
          <button
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {isSubmitting
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-400">
          {isRegister ? "Already have an account? " : "New to MyFinance? "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-blue-300 hover:text-blue-200"
          >
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-300">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        minLength={type === "password" ? 8 : undefined}
        className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}
