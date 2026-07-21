import type { RedactionOptions } from "./types";

function cloneAndRedact(
  value: unknown,
  options: Required<RedactionOptions>,
  path: string[],
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      cloneAndRedact(item, options, [...path, String(index)]),
    );
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      const childPath = [...path, key];
      const redact =
        options.keys.includes(key) ||
        options.paths.includes(childPath.join("."));
      return [
        key,
        redact
          ? options.replacement
          : cloneAndRedact(child, options, childPath),
      ];
    }),
  );
}

export function redactValue(
  value: unknown,
  options: RedactionOptions = {},
): unknown {
  return cloneAndRedact(
    value,
    {
      keys: options.keys ?? [],
      paths: options.paths ?? [],
      replacement: options.replacement ?? "[REDACTED]",
    },
    [],
  );
}
