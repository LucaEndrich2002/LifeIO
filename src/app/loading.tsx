export default function Loading() {
  return (
    <div role="status" className="space-y-6 py-6">
      <p className="text-sm text-muted-foreground">
        Dein Überblick wird geladen …
      </p>
      <div
        aria-hidden="true"
        className="h-64 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none"
      />
    </div>
  );
}
