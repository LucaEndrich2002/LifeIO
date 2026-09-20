import Link from "next/link";
import { redirect } from "next/navigation";
import { nextStep } from "@/domain/onboarding";
import { FinancialSummary } from "@/features/onboarding/financial-summary";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { loadOnboarding } from "@/server/onboarding";

export async function OverviewScreen() {
  const data = await loadOnboarding();
  if (!data.state?.completed_at)
    redirect(`/account/onboarding/${nextStep(data.state)}`);
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Deine Einrichtung ist abgeschlossen
        </p>
        <h1 className="break-words text-3xl font-semibold tracking-tight">
          Dein Start, {data.profile.display_name}.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Hier ist deine persönliche Ausgangslage aus deinen gespeicherten
          Angaben.
        </p>
      </div>
      <FinancialSummary data={data} />
      <p className="rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
        Dies ist deine Startübersicht. Die laufende Verwaltung von Einnahmen,
        Ausgaben und Zielen folgt im nächsten Ausbau. Aufgaben und Termine
        kannst du später im Plan-Bereich ergänzen.
      </p>
      <Link
        href="/account"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
      >
        Profil bearbeiten
      </Link>
      <SignOutButton />
    </div>
  );
}
