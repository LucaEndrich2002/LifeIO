"use client";

import { useState, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export function PreviewSwitcher({
  example,
  empty,
}: {
  example: ReactNode;
  empty: ReactNode;
}) {
  const [view, setView] = useState<"example" | "empty">("example");
  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FlaskConical
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium">Dashboard-Vorschau</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Alle gezeigten Daten sind fiktiv. Funktionen sind in Vorbereitung.
            </p>
          </div>
        </div>
        <div
          role="group"
          aria-label="Vorschauansicht"
          className="flex shrink-0 gap-1 rounded-xl bg-muted p-1"
        >
          {(
            [
              ["example", "Beispieldaten"],
              ["empty", "Ohne Einträge"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              aria-controls="dashboard-preview"
              onClick={() => setView(value)}
              className={cn(
                "min-h-10 flex-1 rounded-lg px-3 text-xs font-medium transition-colors",
                view === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div id="dashboard-preview">{view === "example" ? example : empty}</div>
    </>
  );
}
