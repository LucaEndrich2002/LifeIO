import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4 py-12">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Diese Seite gibt es nicht.
      </h1>
      <p className="text-muted-foreground">
        Über die Navigation findest du zurück zu deinem Überblick.
      </p>
      <Link
        href="/"
        className="inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
      >
        Zur Startseite
      </Link>
    </div>
  );
}
