import { describe, it, expect } from "bun:test";
import { relationFields } from "../../relation/relationFields";

{
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
}

{
  describe("relationFields", () => {
    it("does not strip _id when it appears mid-name", () => {
      const fields = relationFields([
        {
          fromTable: "audits",
          from: "user",
          to: "users",
          type: "belongsTo",
          linkedBy: ["user_id_old"],
        },
      ]);
      expect(fields).toEqual(["  user_id_old?: Users;"]);
    });
  });
}

{
  describe("relationFields", () => {
    it("strips only a trailing _id from the FK column name", () => {
      const fields = relationFields([
        {
          fromTable: "orders",
          from: "owner",
          to: "users",
          type: "belongsTo",
          linkedBy: ["created_by_id"],
        },
      ]);
      expect(fields).toEqual(["  created_by?: Users;"]);
    });
  });
}

{
  describe("relationFields", () => {
    it("generates hasMany field as an array using rel.from for the name", () => {
      const fields = relationFields([
        {
          fromTable: "users",
          from: "posts",
          to: "posts",
          type: "hasMany",
          linkedBy: [],
        },
      ]);
      // hasMany → array; name = rel.from; type = toPascalCase(rel.to).
      expect(fields).toEqual(["  posts?: Posts[];"]);
    });
  });
}

{
  describe("relationFields", () => {
    it("ignores linkedBy for hasMany, always using rel.from for the name", () => {
      const fields = relationFields([
        {
          fromTable: "users",
          from: "orders",
          to: "orders",
          type: "hasMany",
          linkedBy: ["user_id"],
        },
      ]);
      expect(fields).toEqual(["  orders?: Orders[];"]);
    });
  });
}
