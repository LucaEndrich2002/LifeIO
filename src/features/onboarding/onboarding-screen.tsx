import Link from "next/link";
import { redirect } from "next/navigation";
import { monthInZone } from "@/domain/money";
import {
  nextStep,
  onboardingSteps,
  type OnboardingStep,
} from "@/domain/onboarding";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";
import { FinancialSummary } from "@/features/onboarding/financial-summary";
import { loadOnboarding } from "@/server/onboarding";

const titles = {
  income: "Dein Einkommen.",
  expenses: "Deine Fixkosten.",
  goal: "Dein erstes Sparziel.",
  review: "Dein Start im Überblick.",
};
const descriptions = {
  income:
    "Was kommt in deinem Startmonat netto an? Trage dein gesamtes monatliches Einkommen ein oder lasse die Angabe bewusst aus.",
  expenses:
    "Miete, Verträge oder andere regelmäßige Kosten: Erfasse bis zu 20 monatliche Positionen. Du kannst diesen Schritt auch auslassen.",
  goal: "Wofür möchtest du sparen? Halte ein erstes Ziel und deinen aktuellen Stand fest oder starte ohne Sparziel.",
  review:
    "Prüfe deine gespeicherten Angaben. Über die Schritte oben kannst du sie vor dem Abschluss noch korrigieren.",
};

export async function OnboardingScreen({ step }: { step: OnboardingStep }) {
  const data = await loadOnboarding();
  if (data.state?.completed_at) redirect("/account/overview");
  const available = onboardingSteps.indexOf(nextStep(data.state));
  const index = onboardingSteps.indexOf(step);
  if (index > available)
    redirect(`/account/onboarding/${onboardingSteps[available]}`);
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Dein LifeOS · Schritt {index + 1} von 4
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {titles[step]}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {descriptions[step]}
        </p>
      </div>
      <nav aria-label="Einrichtungsschritte">
        <ol className="grid grid-cols-2 gap-2">
          {onboardingSteps.map((item, position) => (
            <li key={item}>
              {position <= available ? (
                <Link
                  href={`/account/onboarding/${item}`}
                  aria-current={item === step ? "step" : undefined}
                  className={`flex min-h-11 items-center rounded-xl border px-3 text-xs font-medium ${item === step ? "border-primary bg-accent text-primary" : "text-muted-foreground"}`}
                >
                  {position + 1}.{" "}
                  {
                    {
                      income: "Einkommen",
                      expenses: "Fixkosten",
                      goal: "Sparziel",
                      review: "Übersicht",
                    }[item]
                  }
                </Link>
              ) : (
                <span className="flex min-h-11 items-center px-3 text-xs text-muted-foreground">
                  {position + 1}.{" "}
                  {
                    {
                      income: "Einkommen",
                      expenses: "Fixkosten",
                      goal: "Sparziel",
                      review: "Übersicht",
                    }[item]
                  }
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {step === "review" && <FinancialSummary data={data} />}
      <OnboardingForm
        key={step}
        step={step}
        initial={{
          revision: data.state?.revision ?? 0,
          month:
            data.state?.month.slice(0, 7) ??
            monthInZone(new Date(), data.profile.time_zone),
          decision:
            step === "income"
              ? (data.state?.income_status ?? "pending")
              : step === "expenses"
                ? (data.state?.expenses_status ?? "pending")
                : (data.state?.goal_status ?? "pending"),
          name: (step === "income" ? data.income?.name : data.goal?.name) ?? "",
          amount: data.income?.amount_minor ?? null,
          expenses: data.expenses,
          target: data.goal?.target_minor ?? null,
          current: data.goal?.current_minor ?? null,
          monthly: data.goal?.monthly_minor ?? null,
        }}
      />
      <Link
        href="/account"
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline"
      >
        Zum Profil · später weitermachen
      </Link>
    </div>
  );
}
