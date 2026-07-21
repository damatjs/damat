import { expect, mock, test } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import { createProviderAuthHandlers } from "../../services/authHandlers";

function createLogger() {
  return {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  };
}

async function request(
  provider: any,
  type: "session" | "flexible" = "session",
) {
  const logger = createLogger();
  const app = new Hono();
  app.use("*", createProviderAuthHandlers(provider, logger as never)[type]!);
  app.get("/", (context) => context.text("protected"));
  return {
    response: await app.request("/", {
      headers: { authorization: "Bearer secret" },
    }),
    logger,
  };
}

test("verifier exceptions and malformed outputs fail closed", async () => {
  const thrown = await request({
    authenticate: async () => {
      throw new Error("Bearer secret");
    },
  });
  expect(thrown.response.status).toBe(401);
  const malformed = await request({ authenticate: async () => ({ id: "" }) });
  expect(malformed.response.status).toBe(401);
  const malformedOrg = await request({
    authenticate: async () => ({ id: "user", orgId: { secret: true } }),
  });
  expect(malformedOrg.response.status).toBe(401);
  expect(thrown.logger.warn).toHaveBeenCalledTimes(1);
});

test("flexible isolates session errors and never logs credentials", async () => {
  const result = await request(
    {
      authenticate: async () => {
        throw new Error("Bearer secret");
      },
      verifyApiKey: async () => ({ id: "machine", keyId: "key", scopes: [] }),
    },
    "flexible",
  );
  expect(result.response.status).toBe(200);
  expect(JSON.stringify(result.logger.warn.mock.calls)).not.toContain("secret");
});
