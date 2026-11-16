import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthSession } from "@/lib/auth-session";

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<SettingsLoading />}><SettingsDetails /></Suspense>
      </div>
    </div>
  );
}

async function SettingsDetails() {
  const session = await getAuthSession();

  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Account</CardTitle><CardDescription>Your profile details.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div><p className="text-sm text-muted-foreground">Name</p><p className="mt-1 font-medium">{session?.user.name}</p></div>
        <div><p className="text-sm text-muted-foreground">Email</p><p className="mt-1 font-medium">{session?.user.email}</p></div>
      </CardContent>
    </Card>
  );
}

function SettingsLoading() {
  return <Card className="mt-6"><CardContent className="flex flex-col gap-4 pt-5"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>;
}
