"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Sparkles, Target, Wallet } from "lucide-react";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const icons = {
  home: House,
  money: Wallet,
  plan: CalendarDays,
  goals: Target,
  ai: Sparkles,
};

export function AppNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="grid grid-cols-5 gap-1 lg:flex lg:flex-col lg:gap-2"
    >
      {navigation.map(({ href, label, icon }) => {
        const Icon = icons[icon];
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3 lg:text-sm",
              active && "bg-accent text-foreground",
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
