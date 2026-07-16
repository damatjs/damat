import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("keeps a singular target name singular (no pluralisation applied)", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "metadata",
        to: "metadata",
        type: "hasOne",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  metadata?: Metadata;"]);
  });
});
