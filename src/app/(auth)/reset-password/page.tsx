import { Suspense } from "react";

import ResetPasswordForm from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return <Suspense fallback={<AuthLoading />}><ResetPasswordForm /></Suspense>;
}

function AuthLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading password reset...</main>;
}
