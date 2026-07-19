import { expect, test } from "bun:test";
import { visibleTransitions } from "../src/inspection/manifest";

const options = (visibility: "full" | "hidden") => ({
  visibility,
  redaction: { keys: ["secret"] },
  cursorSigningKey: "test-signing-key-with-at-least-32-bytes",
  client: {} as never,
});

test("transition visibility redacts full records and strips hidden edge values", () => {
  const rows = [
    {
      id: "t",
      from_execution_id: null,
      to_execution_id: null,
      edge: { from: "a", to: "b", input: { secret: 1 } },
      reason: "test",
      created_at: new Date(),
    },
  ];
  expect(visibleTransitions(rows, options("full"))[0]).toBeDefined();
  expect(visibleTransitions(rows, options("hidden"))).toEqual([
    { ...rows[0], edge: { from: "a", to: "b" } },
  ]);
});
