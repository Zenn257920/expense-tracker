import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar, { DashboardHeader } from "@/components/layout/sidebar";
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardLoading() {
  return <div className="min-h-screen bg-background" />;
}
