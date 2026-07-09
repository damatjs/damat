/** Decorative oversized trust-score numeral behind hero content. */
export function GhostNumeral({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={`ghost-numeral ${className}`}>
      {value}
    </span>
  );
}
