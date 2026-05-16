import { describe, it, expect } from "bun:test";
import { runTransaction, runTransactionWithClient } from "..";

describe("transaction utilities", () => {
  it("should export runTransaction function", () => {
    expect(runTransaction).toBeFunction();
  });

  it("should export runTransactionWithClient function", () => {
    expect(runTransactionWithClient).toBeFunction();
  });
});
