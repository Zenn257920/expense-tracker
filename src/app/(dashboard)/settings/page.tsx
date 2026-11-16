import { Suspense } from "react";

import { getAuthSession } from "@/lib/auth-session";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-zinc-400">Your account information.</p>
        <Suspense fallback={<SettingsLoading />}>
          <SettingsDetails />
        </Suspense>
      </div>
    </main>
  );
}

async function SettingsDetails() {
  const session = await getAuthSession();

  return (
    <section className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
      <div><p className="text-xs text-zinc-500">Name</p><p className="mt-1">{session?.user.name}</p></div>
      <div><p className="text-xs text-zinc-500">Email</p><p className="mt-1">{session?.user.email}</p></div>
    </section>
  );
}

function SettingsLoading() {
  return <div className="mt-8 h-32 animate-pulse rounded-2xl border border-white/10 bg-zinc-900" />;
}
