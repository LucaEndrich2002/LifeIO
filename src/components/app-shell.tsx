import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Orbit } from "lucide-react";
import { AppNavigation } from "@/components/app-navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only"
      >
        Zum Inhalt springen
      </a>
      <aside className="border-b bg-card px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
        <div className="mb-5 flex items-center justify-between lg:mb-12">
          <Link
            href="/"
            aria-label="LifeOS – Startseite"
            className="inline-flex items-center gap-2.5 px-2 text-xl font-bold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Orbit className="size-5" aria-hidden="true" />
            </span>
            LifeOS
            <span className="ml-1 rounded border px-1.5 py-0.5 text-[9px] font-medium tracking-wider text-muted-foreground">
              PREVIEW
            </span>
          </Link>
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>
        <p className="mb-3 hidden px-4 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase lg:block">
          Dein persönlicher Raum
        </p>
        <AppNavigation />
        <div className="mt-auto hidden px-3 pt-12 lg:block">
          <div className="mb-6 h-px bg-border" />
          <p className="text-sm font-medium">Ein Leben. Ein Überblick.</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Geld, Zeit und Ziele.
            <br />
            Platz für das, was dir wichtig ist.
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b px-6 lg:h-20 lg:px-10">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            DEIN LIFEOS{" "}
            <span className="mx-2 text-border" aria-hidden="true">
              /
            </span>{" "}
            Ein guter Anfang
          </p>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <ArrowUpRight
            className="size-4 text-muted-foreground lg:hidden"
            aria-hidden="true"
          />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-6 py-10 outline-none lg:px-10 lg:py-12"
        >
          {children}
        </main>
        <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs leading-relaxed text-muted-foreground lg:px-10">
          LifeOS entsteht Schritt für Schritt. Diese Vorschau speichert noch
          keine persönlichen Daten.
        </footer>
      </div>
    </div>
  );
}
