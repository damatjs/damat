import { beforeEach, expect, test } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import {
  installMetricsMiddleware,
  installMetricsRoute,
  resetMetrics,
} from "../src/operations";

const logger = {} as never;
const config = { http: { port: 1 } } as never;

beforeEach(() => {
  process.env.METRICS_TOKEN = "metrics-token-that-is-long-and-random-1234";
  resetMetrics();
});

test("protects Prometheus metrics and records HTTP outcomes", async () => {
  const app = new Hono();
  installMetricsMiddleware({ app, logger, config });
  app.get("/ok", (context) => context.text("ok"));
  app.get("/fail", (context) => context.text("failed", 500));
  installMetricsRoute({ app, logger, config });
  await app.request("/ok");
  await app.request("/fail");
  expect((await app.request("/metrics")).status).toBe(401);
  const response = await app.request("/metrics", {
    headers: { authorization: `Bearer ${process.env.METRICS_TOKEN}` },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/plain");
  const body = await response.text();
  expect(body).toContain("damat_http_requests_total 3");
  expect(body).toContain("damat_http_errors_total 1");
  expect(body).toContain("damat_process_resident_memory_bytes");
});
