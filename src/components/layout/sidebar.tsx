"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  Wallet,
  Handshake,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Categories", href: "/categories", icon: Tags },
  { label: "Loans", href: "/loans", icon: Handshake },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleLogout() {
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        toast.error(
          result.error.message ?? "Could not sign out. Please try again.",
        );
        return;
      }

      setIsLogoutOpen(false);
      toast.success("Signed out successfully.");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-20 justify-center px-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-700 text-white">
            <Wallet aria-hidden="true" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold">
              MyFinance
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Personal finance
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup className="px-3 py-4 group-data-[collapsible=icon]:px-2">
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      size="lg"
                      tooltip={item.label}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <Icon />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsLogoutOpen(true)}
              tooltip="Sign out"
              size="lg"
              className="text-muted-foreground"
            >
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">
                Sign out
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of MyFinance?</AlertDialogTitle>
            <AlertDialogDescription>
              You can sign back in at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleLogout}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}

export function DashboardHeader() {
  const pathname = usePathname();
  const title =
    pathname === "/transactions/new"
      ? "Add transaction"
      : (menuItems.find(
          (item) =>
            pathname === item.href || pathname.startsWith(`${item.href}/`),
        )?.label ?? "Workspace");

  return (
    <header className="flex h-14 items-center gap-3 border-b px-4 sm:px-6 justify-between">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="h-5 w-px bg-border" />
        <h1 className="text-sm font-medium text-foreground">{title}</h1>
      </div>
      {/* <div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/transactions/new" />}
        >
          <Plus data-icon="inline-start" />
          Add Transaction
        </Button>
      </div> */}
    </header>
  );
}
