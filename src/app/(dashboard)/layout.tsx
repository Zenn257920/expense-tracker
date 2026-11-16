import { Suspense } from "react";
import Sidebar from "@/components/layout/sidebar";
import { getAuthSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<DashboardLoading />}><ProtectedDashboard>{children}</ProtectedDashboard></Suspense>;
}

async function ProtectedDashboard({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white md:flex-row">
      <Sidebar />

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function DashboardLoading() {
  return <div className="min-h-screen bg-zinc-950" />;
}
