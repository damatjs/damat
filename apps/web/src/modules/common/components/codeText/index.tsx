import { Fragment } from "react";

/** Plain text whose `backtick` spans render as inline code. */
export function CodeText({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code
            // biome-ignore lint/suspicious/noArrayIndexKey: static text, order never changes
            key={i}
            className="rounded border border-line bg-subtle px-1 py-0.5 font-mono text-xs text-ink"
          >
            {part}
          </code>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static text, order never changes
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
