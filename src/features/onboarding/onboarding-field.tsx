import type { ComponentProps } from "react";

const inputClass =
  "min-h-12 w-full rounded-xl border bg-background px-3 text-base";
export function OnboardingField({
  label,
  error,
  id,
  ...props
}: ComponentProps<"input"> & { label: string; error?: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <input
        {...props}
        id={id}
        className={inputClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
