import Sidebar from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white md:flex-row">
      <Sidebar />

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
