export default function Loading() {
  return (
    <div role="status" className="space-y-6 py-6">
      <p className="text-sm text-muted-foreground">
        Dein Überblick wird geladen …
      </p>
      <div
        aria-hidden="true"
        className="space-y-6 animate-pulse motion-reduce:animate-none"
      >
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-36 rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="h-72 rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
