import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { supportedTimeZones } from "@/domain/profile";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { ProfileForm } from "@/features/profile/profile-form";
import { requireIdentity } from "@/server/identity";

export async function ProfileScreen({
  passwordUpdated,
}: {
  passwordUpdated: boolean;
}) {
  const { supabase, user } = await requireIdentity();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name,time_zone,currency")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Profile could not be loaded.");
  const onboarding = profile
    ? await supabase
        .from("onboarding")
        .select("completed_at,month")
        .eq("user_id", user.id)
        .maybeSingle()
    : null;
  if (onboarding?.error) throw new Error("Onboarding status unavailable.");
  return (
    <div className="space-y-7">
      {passwordUpdated && (
        <p role="status" className="rounded-xl border bg-accent p-4 text-sm">
          Dein Passwort wurde geändert.
        </p>
      )}
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Dein Konto
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {profile ? "Dein Profil." : "Richte dein Profil ein."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Dein Anzeigename und deine Zeitzone bilden den Anfang deines
          persönlichen LifeOS.
        </p>
      </div>
      <Card>
        <CardContent>
          <ProfileForm
            initial={
              profile ?? { display_name: "", time_zone: "Europe/Berlin" }
            }
            timeZones={supportedTimeZones}
          />
        </CardContent>
      </Card>
      {profile ? (
        <Link
          href={
            onboarding?.data?.completed_at
              ? `/account/money?month=${onboarding.data.month.slice(0, 7)}`
              : "/account/onboarding"
          }
          className="flex min-h-12 items-center justify-center rounded-xl border border-primary px-5 py-3 text-sm font-medium text-primary"
        >
          {onboarding?.data?.completed_at
            ? "Meine Finanzübersicht öffnen"
            : "Weiter zur Einrichtung"}
        </Link>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Speichere zuerst dein Profil. Danach kannst du Einkommen, Fixkosten
          und dein erstes Sparziel einrichten sowie erste Aufgaben anlegen.
        </p>
      )}
      {onboarding?.data?.completed_at && (
        <Link
          href="/account/home"
          className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Mein Dashboard öffnen
        </Link>
      )}
      <SignOutButton />
    </div>
  );
}
