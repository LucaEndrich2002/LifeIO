import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AuthForm } from "@/features/auth/auth-form";
import type { AuthMode } from "@/features/auth/form-state";
import {
  changePassword,
  confirmEmail,
  requestRecovery,
  resendConfirmation,
  signIn,
  signUp,
  verifyRecovery,
} from "@/server/auth-actions";

const screens = {
  resend: {
    title: "Ein neuer Bestätigungscode.",
    description:
      "Falls die Registrierung noch nicht bestätigt ist, erhältst du einen neuen Code per E-Mail.",
    submitLabel: "Bestätigungscode anfordern",
    action: resendConfirmation,
  },
  login: {
    title: "Willkommen zurück.",
    description: "Melde dich an, um dein persönliches Profil zu öffnen.",
    submitLabel: "Anmelden",
    action: signIn,
  },
  signup: {
    title: "Dein Anfang mit LifeOS.",
    description:
      "Erstelle dein Konto. Anschließend bestätigst du deine E-Mail-Adresse mit einem Code.",
    submitLabel: "Konto erstellen",
    action: signUp,
  },
  confirm: {
    title: "Bestätige deine E-Mail.",
    description:
      "Wenn die Registrierung möglich war, findest du einen sechsstelligen Code in deinem Postfach. Er gilt eine Stunde und kann einmal verwendet werden.",
    submitLabel: "E-Mail bestätigen",
    action: confirmEmail,
  },
  recover: {
    title: "Passwort vergessen?",
    description:
      "Wir senden dir einen Code, mit dem du ein neues Passwort festlegen kannst.",
    submitLabel: "Code anfordern",
    action: requestRecovery,
  },
  recovery: {
    title: "Prüfe dein Postfach.",
    description:
      "Falls ein Konto zu dieser Adresse besteht, erhältst du einen sechsstelligen Code. Er gilt eine Stunde und kann einmal verwendet werden.",
    submitLabel: "Code prüfen",
    action: verifyRecovery,
  },
  password: {
    title: "Ein neues Passwort.",
    description: "Wähle ein langes Passwort, das du nur für LifeOS verwendest.",
    submitLabel: "Passwort speichern",
    action: changePassword,
  },
} as const;

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const screen = screens[mode];
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Dein persönlicher Raum
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {screen.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {screen.description}
        </p>
      </div>
      <Card>
        <CardContent>
          <AuthForm
            key={mode}
            mode={mode}
            action={screen.action}
            submitLabel={screen.submitLabel}
          />
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary">
        {mode !== "login" && (
          <Link
            href="/auth/login"
            className="inline-flex min-h-11 items-center rounded-md hover:underline"
          >
            Zur Anmeldung
          </Link>
        )}
        {mode === "login" && (
          <>
            <Link
              href="/auth/signup"
              className="inline-flex min-h-11 items-center rounded-md hover:underline"
            >
              Konto erstellen
            </Link>
            <Link
              href="/auth/recover"
              className="inline-flex min-h-11 items-center rounded-md hover:underline"
            >
              Passwort vergessen?
            </Link>
            <Link
              href="/auth/confirm"
              className="inline-flex min-h-11 items-center rounded-md hover:underline"
            >
              E-Mail bestätigen
            </Link>
          </>
        )}
        {mode === "recovery" && (
          <Link
            href="/auth/recover"
            className="inline-flex min-h-11 items-center rounded-md hover:underline"
          >
            Neuen Code anfordern
          </Link>
        )}
        {mode === "confirm" && (
          <Link
            href="/auth/resend"
            className="inline-flex min-h-11 items-center rounded-md hover:underline"
          >
            Neuen Code anfordern
          </Link>
        )}
      </div>
    </div>
  );
}
