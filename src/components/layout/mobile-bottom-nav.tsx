"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Plus,
  Settings,
  Tags,
} from "lucide-react";

import AddTransactionForm from "@/components/transactions/add-transaction-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCategories } from "@/hooks/use-categories";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Categories", href: "/categories", icon: Tags },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Mobile-only bottom navigation. The middle slot is the add-transaction
// dialog (same form as the header button); the layout adds bottom
// padding on mobile so this bar never covers page content.
export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { categories, isLoading, error, refreshCategories } =
    useCategories();
  const [isOpen, setIsOpen] = useState(false);

  async function handleTransactionAdded() {
    router.refresh();
    setIsOpen(false);
  }

  // Dashboard, Transactions, [+], Categories, Settings.
  const slots: (typeof navItems[number] | null)[] = [
    navItems[0],
    navItems[1],
    null,
    navItems[2],
    navItems[3],
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid h-16 grid-cols-5 items-center">
        {slots.map((item) => {
          if (item === null) {
            return (
              <div key="add" className="flex items-center justify-center">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        type="button"
                        size="icon-lg"
                        aria-label="Add transaction"
                        className="size-12 rounded-full shadow-lg"
                      >
                        <Plus />
                      </Button>
                    }
                  />
                  <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Add transaction</DialogTitle>
                      <DialogDescription>
                        Record your income or expenses.
                      </DialogDescription>
                    </DialogHeader>
                    <AddTransactionForm
                      categories={categories}
                      isLoadingCategories={isLoading}
                      categoriesError={error}
                      onTransactionAdded={handleTransactionAdded}
                      onCategoriesChanged={refreshCategories}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            );
          }

          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
