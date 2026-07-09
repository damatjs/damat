/** Tiny className joiner — the registry app has no conditional-variant needs
 *  that would justify clsx + tailwind-merge. */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}
