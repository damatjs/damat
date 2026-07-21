import { expect, test } from "bun:test";
import { normalizeAuthCredentials } from "../../services/authCredentials";

test("auth credentials normalize headers, cookies, bearer, and API key", () => {
  const credentials = normalizeAuthCredentials(
    new Headers({
      Authorization: "Bearer session-secret",
      Cookie: "sid=cookie%20secret; theme=dark; malformed",
      "X-API-Key": "api-secret",
      "X-Custom": "value",
    }),
  );
  expect(credentials.headers["x-custom"]).toBe("value");
  expect(credentials.cookies).toEqual({ sid: "cookie secret", theme: "dark" });
  expect(credentials.authorization).toBe("Bearer session-secret");
  expect(credentials.bearerToken).toBe("session-secret");
  expect(credentials.apiKey).toBe("api-secret");
  expect(JSON.stringify(credentials)).toBe('"[REDACTED]"');
  expect(JSON.stringify(credentials.headers)).toBe('"[REDACTED]"');
  expect(JSON.stringify(credentials.cookies)).toBe('"[REDACTED]"');
  expect(JSON.stringify({ headers: credentials.headers })).not.toContain(
    "session-secret",
  );
  expect(Object.keys(credentials)).toEqual([]);
});

test("malformed cookies and non-bearer authorization stay transport-neutral", () => {
  const credentials = normalizeAuthCredentials(
    new Headers({ Authorization: "Basic value", Cookie: "sid=%E0%A4%A" }),
  );
  expect(credentials.bearerToken).toBeNull();
  expect(credentials.apiKey).toBeNull();
  expect(credentials.cookies.sid).toBe("%E0%A4%A");
});
