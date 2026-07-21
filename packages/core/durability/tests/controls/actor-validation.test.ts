import { expect, test } from "bun:test";
import { validateWorkActor } from "../../src";

test("work actors require an identity and supported type", () => {
  expect(() => validateWorkActor(undefined)).toThrow(/actor is required/);
  expect(() => validateWorkActor({ id: " ", type: "user" })).toThrow(
    /actor id/,
  );
  expect(() =>
    validateWorkActor({ id: "actor", type: "other" as "user" }),
  ).toThrow(/actor type/);
});

test("work actors accept attributed metadata without mutation", () => {
  const actor = {
    id: "operator",
    type: "service" as const,
    metadata: { x: 1 },
  };
  expect(validateWorkActor(actor)).toBe(actor);
  expect(actor.metadata).toEqual({ x: 1 });
});
