import { expect, test } from "bun:test";
import { createJobInspectionClient } from "../../src/inspection";
import { database } from "./context";

test("inspection validates required configuration", () => {
  expect(() => createJobInspectionClient(undefined as never)).toThrow(
    "cursorSigningKey is required",
  );
  expect(() =>
    createJobInspectionClient({
      cursorSigningKey: "",
      client: database,
    }),
  ).toThrow("Cursor signing key cannot be empty");
  expect(() =>
    createJobInspectionClient({
      cursorSigningKey: new Uint8Array(),
      client: database,
    }),
  ).toThrow("Cursor signing key cannot be empty");
  expect(() =>
    createJobInspectionClient({
      cursorSigningKey: "key",
      staleAfterMs: 0,
      client: database,
    }),
  ).toThrow("staleAfterMs must be a positive safe integer");
});
