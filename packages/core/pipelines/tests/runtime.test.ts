import { expect, test } from "bun:test";
import {
  evaluatePipelineExpression,
  evaluatePipelineValue,
  nextCronOccurrence,
  parsePipelineWakeup,
} from "../src";

const context = {
  input: { total: 120, tier: "gold" },
  trigger: { kind: "api" },
  nodes: { reserve: { output: { reservationId: "r-1" } } },
};

test("evaluates closed references and branch expressions", () => {
  expect(
    evaluatePipelineValue(
      {
        reservation: { $ref: "nodes.reserve.output.reservationId" },
        total: { $ref: "input.total" },
      },
      context,
    ),
  ).toEqual({ reservation: "r-1", total: 120 });
  expect(
    evaluatePipelineExpression(
      {
        op: "and",
        values: [
          { op: "gte", left: { $ref: "input.total" }, right: 100 },
          { op: "eq", left: { $ref: "input.tier" }, right: "gold" },
        ],
      },
      context,
    ),
  ).toBe(true);
  expect(
    evaluatePipelineValue({ $ref: "input.toString" }, context),
  ).toBeUndefined();
});

test("calculates five-field UTC cron occurrences", () => {
  const next = nextCronOccurrence(
    "0 9 * * 1",
    new Date("2026-07-17T10:30:00Z"),
  );
  expect(next.toISOString()).toBe("2026-07-20T09:00:00.000Z");
  const eitherDay = nextCronOccurrence(
    "0 9 20 * 1",
    new Date("2026-07-18T10:00:00Z"),
  );
  expect(eitherDay.toISOString()).toBe("2026-07-20T09:00:00.000Z");
  const sunday = nextCronOccurrence(
    "0 9 * * 7",
    new Date("2026-07-18T10:00:00Z"),
  );
  expect(sunday.toISOString()).toBe("2026-07-19T09:00:00.000Z");
});

test("accepts only namespaced pipeline wakeups", () => {
  expect(parsePipelineWakeup('{"kind":"pipelines","scope":"orders"}')).toEqual({
    kind: "pipelines",
    scope: "orders",
  });
  expect(parsePipelineWakeup('{"kind":"jobs"}')).toBeUndefined();
  expect(parsePipelineWakeup("bad-json")).toBeUndefined();
});
