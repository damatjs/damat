import type { AuthCredentials } from "@damatjs/provider-auth";

export function normalizeAuthCredentials(headers: Headers): AuthCredentials {
  const normalized: Record<string, string> = {};
  for (const [name, value] of headers.entries())
    normalized[name.toLowerCase()] = value;
  const authorization = clean(normalized.authorization);
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
  const credentials = Object.create(null) as AuthCredentials;
  Object.defineProperties(credentials, {
    headers: hidden(redactable(normalized)),
    cookies: hidden(redactable(parseCookies(normalized.cookie))),
    authorization: hidden(authorization),
    bearerToken: hidden(bearer),
    apiKey: hidden(clean(normalized["x-api-key"])),
    toJSON: hidden(() => "[REDACTED]"),
  });
  return Object.freeze(credentials);
}

function redactable(
  values: Record<string, string>,
): Readonly<Record<string, string>> {
  Object.defineProperty(
    values,
    "toJSON",
    hidden(() => "[REDACTED]"),
  );
  return Object.freeze(values);
}

function clean(value: string | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}

function hidden(value: unknown): PropertyDescriptor {
  return { value, enumerable: false, writable: false, configurable: false };
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header?.split(";") ?? []) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    cookies[name] = decodeCookie(part.slice(index + 1).trim());
  }
  return cookies;
}

function decodeCookie(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
