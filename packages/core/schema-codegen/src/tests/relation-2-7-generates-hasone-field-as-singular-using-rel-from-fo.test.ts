import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("generates hasOne field as singular using rel.from for the name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "profile",
        to: "profiles",
        type: "hasOne",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  profile?: Profiles;"]);
  });
});
