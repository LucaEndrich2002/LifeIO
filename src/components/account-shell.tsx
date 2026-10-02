import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Orbit } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AccountShell({
  children,
  navigation = false,
}: {
  children: ReactNode;
  navigation?: boolean;
}) {
  return (
    <div className="min-h-dvh">
      <a
        href="#account-content"
        className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only"
      >
        Zum Inhalt springen
      </a>
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xl font-bold"
        >
          <Orbit className="size-7 text-primary" aria-hidden="true" />
          LifeOS
        </Link>
        <ThemeToggle />
      </header>
      {navigation && (
        <nav
          aria-label="Persönliche Bereiche"
          className="mx-auto flex max-w-5xl flex-wrap gap-x-6 px-6 text-sm"
        >
          {[
            ["Home", "/account/home"],
            ["Money", "/account/money"],
            ["Plan", "/account/plan"],
            ["Goals", "/account/goals"],
            ["AI", "/account/ai"],
            ["Profil", "/account"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href!}
              className="inline-flex min-h-11 items-center underline"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      <main
        id="account-content"
        tabIndex={-1}
        className="mx-auto max-w-lg px-6 pt-6 pb-12 outline-none has-[.home-dashboard]:max-w-5xl sm:pt-12"
      >
        {children}
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Zur Dashboard-Vorschau
        </Link>
      </main>
    </div>
  );
}
