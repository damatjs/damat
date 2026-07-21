import { describe, expect, test } from "bun:test";
import { hashBytes } from "../../index";

describe("hashBytes", () => {
  test("matches standard SHA-256 vectors", () => {
    expect(hashBytes(new Uint8Array())).toBe(
      "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(hashBytes(Buffer.from("abc"))).toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
