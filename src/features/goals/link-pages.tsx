export function LinkPages({
  page,
  count,
  label,
  href,
  unit = "Verknüpfungen",
}: {
  page: number;
  count: number;
  label: string;
  href: (page: number) => string;
  unit?: string;
}) {
  if (count <= 25 && page === 0) return null;
  return (
    <nav aria-label={label} className="flex flex-wrap gap-5 text-sm">
      {page > 0 && (
        <a
          href={href(page - 1)}
          className="inline-flex min-h-11 items-center underline"
        >
          Vorherige Seite
        </a>
      )}
      <span className="py-3">
        Seite {page + 1} · {count} {unit}
      </span>
      {(page + 1) * 25 < count && (
        <a
          href={href(page + 1)}
          className="inline-flex min-h-11 items-center underline"
        >
          Nächste Seite
        </a>
      )}
    </nav>
  );
}
