import { describe, it, expect } from "bun:test";
import { parseWindowToMs } from "../../utils/windowParser";

describe("parseWindowToMs", () => {
  describe("valid windows", () => {
    it("parses seconds", () => {
      expect(parseWindowToMs("1s")).toBe(1000);
      expect(parseWindowToMs("30s")).toBe(30000);
    });

    it("parses minutes", () => {
      expect(parseWindowToMs("1m")).toBe(60000);
      expect(parseWindowToMs("5m")).toBe(300000);
    });

    it("parses hours", () => {
      expect(parseWindowToMs("1h")).toBe(3600000);
      expect(parseWindowToMs("2h")).toBe(7200000);
    });

    it("parses days", () => {
      expect(parseWindowToMs("1d")).toBe(86400000);
      expect(parseWindowToMs("7d")).toBe(604800000);
    });

    it("handles multi-digit values", () => {
      expect(parseWindowToMs("120s")).toBe(120000);
    });

    it("handles zero", () => {
      expect(parseWindowToMs("0m")).toBe(0);
    });
  });

  describe("invalid windows", () => {
    it("throws on an empty string", () => {
      expect(() => parseWindowToMs("")).toThrow("Invalid window format");
    });

    it("throws on a missing unit", () => {
      expect(() => parseWindowToMs("10")).toThrow("Invalid window format");
    });

    it("throws on an unsupported unit", () => {
      expect(() => parseWindowToMs("10w")).toThrow("Invalid window format");
      expect(() => parseWindowToMs("10y")).toThrow("Invalid window format");
    });

    it("throws on a missing value", () => {
      expect(() => parseWindowToMs("m")).toThrow("Invalid window format");
    });

    it("throws on negative values", () => {
      expect(() => parseWindowToMs("-5m")).toThrow("Invalid window format");
    });

    it("throws on decimals", () => {
      expect(() => parseWindowToMs("1.5h")).toThrow("Invalid window format");
    });

    it("throws on leading/trailing whitespace", () => {
      expect(() => parseWindowToMs(" 5m")).toThrow("Invalid window format");
      expect(() => parseWindowToMs("5m ")).toThrow("Invalid window format");
    });

    it("throws on uppercase units (units are case-sensitive)", () => {
      expect(() => parseWindowToMs("5M")).toThrow("Invalid window format");
    });
  });
});
