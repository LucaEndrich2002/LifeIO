export default function AccountLoading() {
  return (
    <div role="status" className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Dein persönlicher Bereich wird geladen …
      </p>
      <div
        aria-hidden="true"
        className="h-72 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
      />
    </div>
  );
}
