import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadEnv } from "../index";

let tmpDir: string;
let envSnapshot: NodeJS.ProcessEnv;

/** Write a file into the temp dir. */
const writeEnvFile = (name: string, content: string): void => {
  fs.writeFileSync(path.join(tmpDir, name), content, "utf-8");
};

beforeEach(() => {
  // Snapshot process.env so loadEnv mutations don't leak across tests.
  envSnapshot = { ...process.env };
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "load-env-test-"));
});

afterEach(() => {
  // Restore process.env exactly: delete added keys, restore original values.
  for (const key of Object.keys(process.env)) {
    if (!(key in envSnapshot)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(envSnapshot)) {
    process.env[key] = value;
  }
  // Clean up temp directory.
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("loadEnv", () => {
  describe("basic loading", () => {
    it("loads variables from a .env file into process.env", () => {
      writeEnvFile(".env", "MY_TEST_KEY=hello");
      expect(process.env.MY_TEST_KEY).toBeUndefined();

      loadEnv("development", tmpDir);

      expect(process.env.MY_TEST_KEY).toBe("hello");
    });

    it("does nothing when no env files exist", () => {
      expect(() => loadEnv("development", tmpDir)).not.toThrow();
      expect(process.env.MY_TEST_KEY).toBeUndefined();
    });

    it("loads multiple keys from a single file", () => {
      writeEnvFile(".env", "A_KEY=1\nB_KEY=2\nC_KEY=3");

      loadEnv("development", tmpDir);

      expect(process.env.A_KEY).toBe("1");
      expect(process.env.B_KEY).toBe("2");
      expect(process.env.C_KEY).toBe("3");
    });

    it("parses quoted values and comments through the parser", () => {
      writeEnvFile(
        ".env",
        '# comment\nQUOTED="hello world"\nINLINE=value # trailing',
      );

      loadEnv("development", tmpDir);

      expect(process.env.QUOTED).toBe("hello world");
      expect(process.env.INLINE).toBe("value");
    });
  });

  describe("precedence vs existing process.env", () => {
    it("does NOT override an already-defined process.env key", () => {
      process.env.PREEXISTING_KEY = "system-value";
      writeEnvFile(".env", "PREEXISTING_KEY=file-value");

      loadEnv("development", tmpDir);

      // Existing (system) value wins.
      expect(process.env.PREEXISTING_KEY).toBe("system-value");
    });

    it("does NOT override an existing key even when its value is empty string", () => {
      // An existing empty string is NOT undefined, so it is preserved.
      process.env.EMPTY_EXISTING = "";
      writeEnvFile(".env", "EMPTY_EXISTING=from-file");

      loadEnv("development", tmpDir);

      expect(process.env.EMPTY_EXISTING).toBe("");
    });

    it("sets a key that is currently undefined", () => {
      delete process.env.FRESH_KEY;
      writeEnvFile(".env", "FRESH_KEY=set");

      loadEnv("development", tmpDir);

      expect(process.env.FRESH_KEY).toBe("set");
    });
  });

  describe("empty values are skipped", () => {
    it("does not set a key whose parsed value is an empty string", () => {
      writeEnvFile(".env", "EMPTY_VAL=");

      loadEnv("development", tmpDir);

      // value is falsy ("") so the loader never assigns it.
      expect(process.env.EMPTY_VAL).toBeUndefined();
      expect("EMPTY_VAL" in process.env).toBe(false);
    });

    it("sets non-empty keys but skips empty ones in the same file", () => {
      writeEnvFile(".env", "SET_ME=yes\nSKIP_ME=");

      loadEnv("development", tmpDir);

      expect(process.env.SET_ME).toBe("yes");
      expect(process.env.SKIP_ME).toBeUndefined();
    });
  });

  describe("file selection / precedence order", () => {
    it("prefers .env.{environment}.local over all others", () => {
      writeEnvFile(".env", "WHICH=base");
      writeEnvFile(".env.local", "WHICH=local");
      writeEnvFile(".env.production", "WHICH=prod");
      writeEnvFile(".env.production.local", "WHICH=prod-local");

      loadEnv("production", tmpDir);

      expect(process.env.WHICH).toBe("prod-local");
    });

    it("prefers .env.{environment} over .env.local and .env", () => {
      writeEnvFile(".env", "WHICH=base");
      writeEnvFile(".env.local", "WHICH=local");
      writeEnvFile(".env.production", "WHICH=prod");

      loadEnv("production", tmpDir);

      expect(process.env.WHICH).toBe("prod");
    });

    it("prefers .env.local over .env", () => {
      writeEnvFile(".env", "WHICH=base");
      writeEnvFile(".env.local", "WHICH=local");

      loadEnv("development", tmpDir);

      expect(process.env.WHICH).toBe("local");
    });

    it("falls back to .env when nothing more specific exists", () => {
      writeEnvFile(".env", "WHICH=base");

      loadEnv("development", tmpDir);

      expect(process.env.WHICH).toBe("base");
    });

    it("uses environment-specific files keyed to the given environment name", () => {
      writeEnvFile(".env", "WHICH=base");
      writeEnvFile(".env.staging", "WHICH=staging");

      loadEnv("staging", tmpDir);

      expect(process.env.WHICH).toBe("staging");
    });

    it("merges keys from ALL files, with later files overriding earlier ones", () => {
      // loadEnv loads every existing file in order; keys present only in a
      // lower-priority file are still loaded, and a shared key takes the value
      // from the higher-priority file.
      writeEnvFile(".env", "BASE_ONLY=from-base\nSHARED=base");
      writeEnvFile(".env.local", "LOCAL_ONLY=from-local\nSHARED=local");

      loadEnv("development", tmpDir);

      // .env.local overrides SHARED; both files' unique keys are present.
      expect(process.env.SHARED).toBe("local");
      expect(process.env.LOCAL_ONLY).toBe("from-local");
      expect(process.env.BASE_ONLY).toBe("from-base");
    });

    it("loads ALL provided files in order, later file overriding earlier key", () => {
      // Regression: loadEnv previously returned after the first file. With two
      // files, the second (higher-priority) file must override a shared key
      // while keys unique to each file remain present.
      writeEnvFile(".env", "OVERRIDE_ME=first\nFIRST_ONLY=one");
      writeEnvFile(".env.local", "OVERRIDE_ME=second\nSECOND_ONLY=two");

      loadEnv("development", tmpDir);

      // Later file (.env.local) wins for the shared key.
      expect(process.env.OVERRIDE_ME).toBe("second");
      // Keys from BOTH files are present.
      expect(process.env.FIRST_ONLY).toBe("one");
      expect(process.env.SECOND_ONLY).toBe("two");
    });
  });

  describe("defaults", () => {
    it("defaults the environment to 'development'", () => {
      writeEnvFile(".env.development", "DEV_DEFAULT=on");
      writeEnvFile(".env", "DEV_DEFAULT=base");

      // No environment argument -> 'development'.
      loadEnv(undefined, tmpDir);

      expect(process.env.DEV_DEFAULT).toBe("on");
    });
  });

  describe("isolation", () => {
    it("does not leak keys between tests (verifies afterEach restore)", () => {
      // MY_TEST_KEY was set in an earlier test; afterEach should have removed it.
      expect(process.env.MY_TEST_KEY).toBeUndefined();
      expect(process.env.WHICH).toBeUndefined();
    });
  });
});
