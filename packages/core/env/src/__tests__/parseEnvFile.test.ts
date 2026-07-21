import { describe, it, expect } from "bun:test";
import { parseEnvFile } from "../parseEnvFile";

describe("parseEnvFile", () => {
  describe("basic KEY=VALUE parsing", () => {
    it("parses a simple key/value pair", () => {
      expect(parseEnvFile("FOO=bar")).toEqual({ FOO: "bar" });
    });

    it("parses multiple key/value pairs across lines", () => {
      const content = "FOO=bar\nBAZ=qux\nNUM=123";
      expect(parseEnvFile(content)).toEqual({
        FOO: "bar",
        BAZ: "qux",
        NUM: "123",
      });
    });

    it("returns an empty object for empty content", () => {
      expect(parseEnvFile("")).toEqual({});
    });

    it("returns an empty object for whitespace-only content", () => {
      expect(parseEnvFile("   \n\t\n   ")).toEqual({});
    });

    it("trims surrounding whitespace from keys and values", () => {
      expect(parseEnvFile("  FOO  =  bar  ")).toEqual({ FOO: "bar" });
    });

    it("trims leading/trailing whitespace on the whole line", () => {
      expect(parseEnvFile("\t  FOO=bar  \t")).toEqual({ FOO: "bar" });
    });

    it("handles a trailing newline", () => {
      expect(parseEnvFile("FOO=bar\n")).toEqual({ FOO: "bar" });
    });

    it("handles multiple consecutive blank lines between entries", () => {
      const content = "FOO=bar\n\n\n\nBAZ=qux";
      expect(parseEnvFile(content)).toEqual({ FOO: "bar", BAZ: "qux" });
    });
  });

  describe("empty values", () => {
    it("parses an empty value", () => {
      expect(parseEnvFile("FOO=")).toEqual({ FOO: "" });
    });

    it("parses an empty value with trailing whitespace", () => {
      expect(parseEnvFile("FOO=   ")).toEqual({ FOO: "" });
    });

    it("parses an empty double-quoted value", () => {
      expect(parseEnvFile('FOO=""')).toEqual({ FOO: "" });
    });

    it("parses an empty single-quoted value", () => {
      expect(parseEnvFile("FOO=''")).toEqual({ FOO: "" });
    });
  });

  describe("comments", () => {
    it("ignores a standalone comment line", () => {
      expect(parseEnvFile("# this is a comment")).toEqual({});
    });

    it("ignores a comment line with leading whitespace", () => {
      expect(parseEnvFile("   # indented comment")).toEqual({});
    });

    it("ignores comment lines mixed with values", () => {
      const content = "# header comment\nFOO=bar\n# another comment\nBAZ=qux";
      expect(parseEnvFile(content)).toEqual({ FOO: "bar", BAZ: "qux" });
    });

    it("strips an inline comment from an unquoted value", () => {
      expect(parseEnvFile("FOO=bar # trailing comment")).toEqual({
        FOO: "bar",
      });
    });

    it("strips an inline comment with no space before #", () => {
      expect(parseEnvFile("FOO=bar#comment")).toEqual({ FOO: "bar" });
    });

    it("does NOT strip a # inside a double-quoted value", () => {
      expect(parseEnvFile('FOO="bar # not a comment"')).toEqual({
        FOO: "bar # not a comment",
      });
    });

    it("does NOT strip a # inside a single-quoted value", () => {
      expect(parseEnvFile("FOO='bar # not a comment'")).toEqual({
        FOO: "bar # not a comment",
      });
    });

    it("treats a value that is only a comment as empty", () => {
      expect(parseEnvFile("FOO= # only a comment")).toEqual({ FOO: "" });
    });
  });

  describe("double-quoted values", () => {
    it("strips surrounding double quotes", () => {
      expect(parseEnvFile('FOO="bar"')).toEqual({ FOO: "bar" });
    });

    it("preserves spaces inside double quotes", () => {
      expect(parseEnvFile('FOO="hello world"')).toEqual({ FOO: "hello world" });
    });

    it("preserves single quotes inside double quotes", () => {
      expect(parseEnvFile(`FOO="it's"`)).toEqual({ FOO: "it's" });
    });

    it("takes content up to the FIRST closing double quote", () => {
      // Parser uses indexOf for the closing quote, so the second pair is dropped.
      expect(parseEnvFile('FOO="a" "b"')).toEqual({ FOO: "a" });
    });

    it("keeps the opening quote when there is no closing double quote", () => {
      // No closing quote found -> value is left as-is (including the lead quote).
      expect(parseEnvFile('FOO="bar')).toEqual({ FOO: '"bar' });
    });
  });

  describe("single-quoted values", () => {
    it("strips surrounding single quotes", () => {
      expect(parseEnvFile("FOO='bar'")).toEqual({ FOO: "bar" });
    });

    it("preserves spaces inside single quotes", () => {
      expect(parseEnvFile("FOO='hello world'")).toEqual({ FOO: "hello world" });
    });

    it("preserves double quotes inside single quotes", () => {
      expect(parseEnvFile(`FOO='say "hi"'`)).toEqual({ FOO: 'say "hi"' });
    });

    it("takes content up to the FIRST closing single quote", () => {
      expect(parseEnvFile("FOO='a' 'b'")).toEqual({ FOO: "a" });
    });

    it("keeps the opening quote when there is no closing single quote", () => {
      expect(parseEnvFile("FOO='bar")).toEqual({ FOO: "'bar" });
    });
  });

  describe("values containing '='", () => {
    it("splits only on the first '=' and keeps the rest as value", () => {
      expect(parseEnvFile("FOO=a=b=c")).toEqual({ FOO: "a=b=c" });
    });

    it("handles base64-like values with trailing '='", () => {
      expect(parseEnvFile("TOKEN=abc123==")).toEqual({ TOKEN: "abc123==" });
    });

    it("handles a connection-string style value", () => {
      expect(parseEnvFile("DB=postgres://u:p@host:5432/db?x=1")).toEqual({
        DB: "postgres://u:p@host:5432/db?x=1",
      });
    });
  });

  describe("malformed lines", () => {
    it("skips a line with no '='", () => {
      expect(parseEnvFile("NOTAVAR")).toEqual({});
    });

    it("skips a bare key with no '=' but keeps valid lines", () => {
      expect(parseEnvFile("JUSTAKEY\nFOO=bar")).toEqual({ FOO: "bar" });
    });

    it("produces an empty key when the line starts with '='", () => {
      expect(parseEnvFile("=value")).toEqual({ "": "value" });
    });

    it("keeps later duplicate keys (last write wins)", () => {
      expect(parseEnvFile("FOO=1\nFOO=2")).toEqual({ FOO: "2" });
    });
  });

  describe("export prefix (current behavior)", () => {
    // The parser does NOT strip a leading `export `. The whole text before the
    // first '=' becomes the key, so the key contains the word "export".
    it("keeps the 'export' prefix as part of the key", () => {
      expect(parseEnvFile("export FOO=bar")).toEqual({ "export FOO": "bar" });
    });
  });

  describe("multiline values (current behavior)", () => {
    // The parser splits on \n, so a double-quoted value spanning multiple lines
    // is NOT joined; the first line has an unterminated quote and the rest is
    // parsed independently.
    it("does not join double-quoted values spanning multiple lines", () => {
      const content = 'FOO="line1\nline2"';
      // First line: opening quote, no closing -> value left with lead quote.
      // Second line: no '=' -> skipped.
      expect(parseEnvFile(content)).toEqual({ FOO: '"line1' });
    });
  });

  describe("no variable expansion", () => {
    // The parser performs no interpolation; ${...} and $VAR are literal.
    it("does not expand ${VAR} references", () => {
      expect(parseEnvFile("BASE=root\nPATH=${BASE}/sub")).toEqual({
        BASE: "root",
        PATH: "${BASE}/sub",
      });
    });

    it("does not expand $VAR references", () => {
      expect(parseEnvFile("FOO=$HOME/bin")).toEqual({ FOO: "$HOME/bin" });
    });
  });

  describe("realistic .env content", () => {
    it("parses a representative multi-line file", () => {
      const content = [
        "# Application config",
        "",
        "APP_NAME=My App",
        'GREETING="Hello, World"',
        "SECRET='s3cr3t#value'",
        "PORT=3000 # the http port",
        "EMPTY=",
        "URL=https://example.com/path?a=1&b=2",
        "  ",
        "# trailing comment",
      ].join("\n");

      expect(parseEnvFile(content)).toEqual({
        APP_NAME: "My App",
        GREETING: "Hello, World",
        SECRET: "s3cr3t#value",
        PORT: "3000",
        EMPTY: "",
        URL: "https://example.com/path?a=1&b=2",
      });
    });
  });
});
