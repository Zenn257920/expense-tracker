import { Suspense } from "react";
import { redirect } from "next/navigation";

import AuthForm from "@/components/auth/auth-form";
import { getAuthSession } from "@/lib/auth-session";

export default function LoginPage() {
  return <Suspense fallback={<AuthLoading />}><LoginContent /></Suspense>;
}

async function LoginContent() {
  if (await getAuthSession()) redirect("/dashboard");
  return <AuthForm mode="login" />;
}

function AuthLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading sign in...</main>;
}
