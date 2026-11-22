import { Suspense } from "react";
import { redirect } from "next/navigation";

import AuthForm from "@/components/auth/auth-form";
import { getAuthSession } from "@/lib/auth-session";

export default function RegisterPage() {
  return <Suspense fallback={<AuthLoading />}><RegisterContent /></Suspense>;
}

async function RegisterContent() {
  if (await getAuthSession()) redirect("/dashboard");
  return <AuthForm mode="register" />;
}

function AuthLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading account form...</main>;
}
