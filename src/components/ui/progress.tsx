export function Progress({ label, value }: { label: string; value: number }) {
  return (
    <progress
      aria-label={label}
      value={value}
      max={100}
      className="block h-2 w-full overflow-hidden rounded-full border-0 bg-muted text-primary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
    >
      {value} %
    </progress>
  );
}
