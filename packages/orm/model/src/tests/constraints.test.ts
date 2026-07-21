import { describe, it, expect } from "bun:test";
import { CategorySchema, OrderSchema } from "./__fixtures__/models";

// ─────────────────────────────────────────────────────────────────────────────
// Constraints — check constraints
// ─────────────────────────────────────────────────────────────────────────────

describe("transform › constraints", () => {
  it("Order has a check constraint on total", () => {
    const constraints = OrderSchema.toTableSchema().constraints;
    expect(constraints).toHaveLength(1);
    const check = constraints?.[0];
    expect(check.type).toBe("check");
    if (check.type === "check") {
      expect(check.condition).toBe("total > 0");
    }
  });

  it("Category has no constraints", () => {
    expect(CategorySchema.toTableSchema().constraints).toHaveLength(0);
  });
});
