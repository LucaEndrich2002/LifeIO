"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="space-y-4 py-12">
      <h1 className="text-2xl font-semibold">Das hat gerade nicht geklappt.</h1>
      <p className="text-muted-foreground">
        Bitte versuche, die Ansicht erneut zu laden.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
