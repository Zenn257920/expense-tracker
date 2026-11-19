import { Suspense } from "react";

import { SettingsForm } from "@/components/settings/settings-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthSession } from "@/lib/auth-session";

export default function SettingsPage() {
  return (
    <main className="p-4 sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile and account security.
          </p>
        </header>

        <Suspense fallback={<SettingsLoading />}>
          <SettingsDetails />
        </Suspense>
      </div>
    </main>
  );
}

async function SettingsDetails() {
  const session = await getAuthSession();
  if (!session) return null;

  return (
    <SettingsForm
      user={{
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
      }}
    />
  );
}

function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {[0, 1].map((item) => (
        <Card key={item}>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-5 w-36" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
