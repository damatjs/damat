import { describe, it, expect } from "bun:test";
import formatConnectionString, {
  encodeDbValue,
} from "../database/formatConnectionString";

describe("encodeDbValue", () => {
  it("should leave safe characters untouched", () => {
    expect(encodeDbValue("postgres")).toBe("postgres");
  });

  it("should percent-encode reserved characters", () => {
    expect(encodeDbValue("p@ss:word/value")).toBe("p%40ss%3Aword%2Fvalue");
  });

  it("should encode spaces", () => {
    expect(encodeDbValue("my user")).toBe("my%20user");
  });

  it("should return an empty string for an empty input", () => {
    expect(encodeDbValue("")).toBe("");
  });
});

describe("formatConnectionString", () => {
  it("should build a URL with user, password, host and db", () => {
    expect(
      formatConnectionString({
        user: "postgres",
        password: "secret",
        host: "localhost",
        db: "mydb",
      }),
    ).toBe("postgres://postgres:secret@localhost/mydb");
  });

  it("should omit credentials and the @ when neither user nor password is given", () => {
    expect(
      formatConnectionString({ host: "localhost", db: "mydb" }),
    ).toBe("postgres://localhost/mydb");
  });

  it("should include the @ when only a user is provided", () => {
    expect(
      formatConnectionString({ user: "admin", host: "db.example.com", db: "x" }),
    ).toBe("postgres://admin@db.example.com/x");
  });

  it("should include `:password@` when only a password is provided", () => {
    expect(
      formatConnectionString({ password: "pw", host: "h", db: "d" }),
    ).toBe("postgres://:pw@h/d");
  });

  it("should percent-encode special characters in user and password", () => {
    expect(
      formatConnectionString({
        user: "us@er",
        password: "p:ss/word",
        host: "localhost",
        db: "mydb",
      }),
    ).toBe("postgres://us%40er:p%3Ass%2Fword@localhost/mydb");
  });

  it("should not encode the host or db values", () => {
    // host is concatenated verbatim (no encoding) — documents current behavior
    expect(
      formatConnectionString({
        host: "127.0.0.1:5432",
        db: "my db",
      }),
    ).toBe("postgres://127.0.0.1:5432/my db");
  });

  it("should produce an undefined host segment when host is omitted", () => {
    // host is interpolated directly; when missing it becomes the string
    // "undefined" — documents current behavior rather than asserting intent.
    expect(formatConnectionString({ db: "mydb" })).toBe(
      "postgres://undefined/mydb",
    );
  });
});
