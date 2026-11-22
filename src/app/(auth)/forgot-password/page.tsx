import { Suspense } from "react";
import { redirect } from "next/navigation";

import ForgotPasswordForm from "@/components/auth/forgot-password-form";
import { getAuthSession } from "@/lib/auth-session";

export default function ForgotPasswordPage() {
  return <Suspense fallback={<AuthLoading />}><ForgotPasswordContent /></Suspense>;
}

async function ForgotPasswordContent() {
  if (await getAuthSession()) redirect("/dashboard");
  return <ForgotPasswordForm />;
}

function AuthLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading password reset...</main>;
}
