import { describe, it, expect } from "bun:test";
import type {
  FindOptions,
  CreateOptions,
  CreateManyOptions,
  UpdateOptions,
  DeleteOptions,
  SoftDeleteOptions,
  CountOptions,
  ExistsOptions,
} from "../../service/type";

describe("Service Types", () => {
  describe("FindOptions", () => {
    it("accepts valid find options", () => {
      const options: FindOptions<"id" | "name"> = {
        select: ["id", "name"],
        where: { status: "active" },
        orderBy: [{ column: "id", direction: "DESC" }],
        skip: 0,
        take: 10,
      };
      expect(options.select).toEqual(["id", "name"]);
    });

    it("accepts empty options", () => {
      const options: FindOptions = {};
      expect(options).toEqual({});
    });

    it("accepts partial options", () => {
      const options: FindOptions = {
        where: { id: 1 },
      };
      expect(options.where).toEqual({ id: 1 });
    });
  });

  describe("CreateOptions", () => {
    it("accepts create options with data", () => {
      const options: CreateOptions = {
        data: { name: "test", email: "test@example.com" },
      };
      expect(options.data).toBeDefined();
    });

    it("accepts returning option", () => {
      const options: CreateOptions = {
        data: { name: "test" },
        returning: ["id", "name"],
      };
      expect(options.returning).toEqual(["id", "name"]);
    });
  });

  describe("CreateManyOptions", () => {
    it("accepts array of data", () => {
      const options: CreateManyOptions = {
        data: [{ name: "a" }, { name: "b" }],
      };
      expect(options.data).toHaveLength(2);
    });
  });

  describe("UpdateOptions", () => {
    it("requires where clause for updates", () => {
      const options: UpdateOptions = {
        where: { id: 1 },
        data: { name: "updated" },
      };
      expect(options.where).toEqual({ id: 1 });
    });
  });

  describe("DeleteOptions", () => {
    it("requires where clause for deletes", () => {
      const options: DeleteOptions = {
        where: { id: 1 },
      };
      expect(options.where).toEqual({ id: 1 });
    });
  });

  describe("SoftDeleteOptions", () => {
    it("requires where clause for soft deletes", () => {
      const options: SoftDeleteOptions = {
        where: { id: 1 },
      };
      expect(options.where).toEqual({ id: 1 });
    });
  });

  describe("CountOptions", () => {
    it("accepts empty options", () => {
      const options: CountOptions = {};
      expect(options).toEqual({});
    });

    it("accepts where clause", () => {
      const options: CountOptions = {
        where: { status: "active" },
      };
      expect(options.where).toBeDefined();
    });
  });

  describe("ExistsOptions", () => {
    it("requires where clause", () => {
      const options: ExistsOptions = {
        where: { email: "test@example.com" },
      };
      expect(options.where).toBeDefined();
    });
  });
});
