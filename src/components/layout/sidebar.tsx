"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Menu,
  X,
  Settings,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Categories", href: "/categories", icon: Tags },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleLogout() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const isCurrentPath = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside className="relative z-40 w-full shrink-0 border-b border-white/10 bg-zinc-950 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r md:border-white/10 md:px-5 md:py-6">
        <div className="flex h-16 items-center justify-between px-4 md:mb-10 md:h-auto md:justify-start md:px-0">
          <div className="flex items-center gap-3">
            <Wallet size={22} className="text-zinc-400" />
            <div>
              <p className="text-base font-bold tracking-tight text-white">
                MyFinance
              </p>
              <p className="hidden text-xs text-zinc-500 md:block">
                Personal finance
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={
              isOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-zinc-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:hidden"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div
          className={`${isOpen ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col border-b border-white/10 bg-zinc-950 px-4 pb-4 pt-2 shadow-2xl shadow-black/40 md:static md:flex md:flex-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Menu
          </p>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isCurrentPath(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-blue-300"
                        : "text-zinc-500 group-hover:text-zinc-300"
                    }
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button type="button" onClick={handleLogout} className="mt-auto flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
