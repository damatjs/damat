import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { FileTransport } from "../file-transport";
import type { LogEntry } from "../types";

/**
 * FileTransport writes to disk. To avoid polluting the repo tree we point every
 * instance at a fresh os.tmpdir() directory and remove it in afterEach. We also
 * always construct with bufferFlushMs:0 so NO setInterval timer is created
 * (avoids leaking timers across the test run); we flush manually instead.
 *
 * Note: the transport only writes if it is "enabled" — enabled is true when
 * config.enabled === true (or via LOG_FILE env). We pass enabled:true.
 */
let tmp: string;

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: "2024-03-14 09:26:53.589",
    level: "info",
    message: "hello",
    context: undefined,
    error: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "logger-ft-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function makeTransport(extra: Record<string, unknown> = {}) {
  return new FileTransport({
    enabled: true,
    dir: tmp,
    bufferFlushMs: 0,
    ...extra,
  });
}

describe("FileTransport: enabled gating", () => {
  it("does not create the directory or write when disabled", () => {
    const dir = join(tmp, "nested");
    const t = new FileTransport({ enabled: false, dir, bufferFlushMs: 0 });
    t.log(entry());
    t.flush();
    expect(existsSync(dir)).toBe(false);
  });

  it("creates the target directory when enabled", () => {
    const dir = join(tmp, "made");
    const t = new FileTransport({ enabled: true, dir, bufferFlushMs: 0 });
    expect(existsSync(dir)).toBe(true);
    t.close();
  });
});

describe("FileTransport: log + flush writes both .log and .md", () => {
  it("writes the buffered entries to dated files on flush", () => {
    const t = makeTransport();
    t.log(entry({ message: "first" }));
    t.log(entry({ message: "second" }));
    // Nothing on disk until flush.
    expect(readdirSync(tmp)).toHaveLength(0);
    t.flush();

    const files = readdirSync(tmp);
    const logFile = files.find((f) => f.endsWith(".log"));
    const mdFile = files.find((f) => f.endsWith(".md"));
    expect(logFile).toBeDefined();
    expect(mdFile).toBeDefined();

    const logContent = readFileSync(join(tmp, logFile!), "utf-8");
    expect(logContent).toContain("first");
    expect(logContent).toContain("second");
  });

  it("formats the .log line as [timestamp] [LEVEL] message\\n", () => {
    const t = makeTransport();
    t.log(entry({ level: "warn", message: "careful", timestamp: "TS" }));
    t.flush();
    const logFile = readdirSync(tmp).find((f) => f.endsWith(".log"))!;
    const content = readFileSync(join(tmp, logFile), "utf-8");
    expect(content).toBe("[TS] [WARN] careful\n");
  });

  it("appends serialized context to the .log line", () => {
    const t = makeTransport();
    t.log(entry({ message: "m", context: { a: 1 }, timestamp: "TS" }));
    t.flush();
    const logFile = readdirSync(tmp).find((f) => f.endsWith(".log"))!;
    expect(readFileSync(join(tmp, logFile), "utf-8")).toBe(
      '[TS] [INFO] m {"a":1}\n',
    );
  });

  it("appends an error block (name/message/stack) to the .log line", () => {
    const t = makeTransport();
    t.log(
      entry({
        message: "m",
        timestamp: "TS",
        error: { name: "Boom", message: "x", stack: "stk" },
      }),
    );
    t.flush();
    const logFile = readdirSync(tmp).find((f) => f.endsWith(".log"))!;
    const content = readFileSync(join(tmp, logFile), "utf-8");
    expect(content).toBe("[TS] [INFO] m\n  Boom: x\n  stk\n");
  });

  it("writes markdown with emoji header, context fence and error fence", () => {
    const t = makeTransport();
    t.log(
      entry({
        level: "error",
        message: "broke",
        timestamp: "TS",
        context: { k: "v" },
        error: { name: "E", message: "msg", stack: "trace" },
      }),
    );
    t.flush();
    const mdFile = readdirSync(tmp).find((f) => f.endsWith(".md"))!;
    const md = readFileSync(join(tmp, mdFile), "utf-8");
    expect(md).toContain("## ❌ ERROR - TS");
    expect(md).toContain("**Message:** broke");
    expect(md).toContain("**Context:**");
    expect(md).toContain('"k": "v"');
    expect(md).toContain("**Error:** E: msg");
    expect(md).toContain("trace");
    expect(md.trimEnd().endsWith("---")).toBe(true);
  });

  it("markdown omits context/error sections when absent", () => {
    const t = makeTransport();
    t.log(entry({ message: "plain", timestamp: "TS" }));
    t.flush();
    const mdFile = readdirSync(tmp).find((f) => f.endsWith(".md"))!;
    const md = readFileSync(join(tmp, mdFile), "utf-8");
    expect(md).not.toContain("**Context:**");
    expect(md).not.toContain("**Error:**");
  });
});

describe("FileTransport: buffer lifecycle", () => {
  it("clears the buffer after flush (second flush writes nothing new)", () => {
    const t = makeTransport();
    t.log(entry({ message: "once" }));
    t.flush();
    const logFile = readdirSync(tmp).find((f) => f.endsWith(".log"))!;
    const after1 = readFileSync(join(tmp, logFile), "utf-8");
    t.flush(); // empty buffer -> no-op
    const after2 = readFileSync(join(tmp, logFile), "utf-8");
    expect(after2).toBe(after1);
    expect((after2.match(/once/g) ?? []).length).toBe(1);
  });

  it("flush with empty buffer does not create files", () => {
    const t = makeTransport();
    t.flush();
    expect(readdirSync(tmp)).toHaveLength(0);
  });

  it("auto-flushes via the interval timer when bufferFlushMs > 0", async () => {
    // A real (short) interval means the constructor installs a setInterval whose
    // callback `() => this.flush()` fires on its own. We log, wait for one tick,
    // and assert the buffer was written WITHOUT calling flush()/close() first.
    // close() is still called afterwards to clear the timer (no leak).
    const t = makeTransport({ bufferFlushMs: 5 });
    t.log(entry({ message: "auto-flushed" }));
    try {
      await new Promise((resolve) => setTimeout(resolve, 30));
      const logFile = readdirSync(tmp).find((f) => f.endsWith(".log"));
      expect(logFile).toBeDefined();
      expect(readFileSync(join(tmp, logFile!), "utf-8")).toContain(
        "auto-flushed",
      );
    } finally {
      t.close();
    }
  });

  it("close() flushes remaining buffer", () => {
    const t = makeTransport();
    t.log(entry({ message: "on-close" }));
    t.close();
    const logFile = readdirSync(tmp).find((f) => f.endsWith(".log"))!;
    expect(readFileSync(join(tmp, logFile), "utf-8")).toContain("on-close");
  });

  it("log() is ignored when disabled", () => {
    const t = new FileTransport({ enabled: false, dir: tmp, bufferFlushMs: 0 });
    t.log(entry());
    t.flush();
    expect(readdirSync(tmp)).toHaveLength(0);
  });
});

describe("FileTransport: rotation", () => {
  it("rotates an existing file that meets/exceeds maxSizeBytes before appending", () => {
    // First, write a file directly that is large, matching the transport's path scheme.
    const t = makeTransport({ maxSizeBytes: 10 });
    // Determine the expected path by flushing one entry, then make it large.
    t.log(entry({ message: "seed" }));
    t.flush();
    const logFile = readdirSync(tmp).find((f) => f.endsWith(".log"))!;
    const fullPath = join(tmp, logFile);
    // Make the file exceed maxSizeBytes.
    writeFileSync(fullPath, "x".repeat(50), "utf-8");

    // Next write should rotate (rename) the oversized file, then append fresh.
    t.log(entry({ message: "after-rotate" }));
    t.flush();

    const files = readdirSync(tmp).filter((f) => f.endsWith(".log"));
    // One rotated file + the new current file.
    expect(files.length).toBeGreaterThanOrEqual(2);
    const current = readFileSync(fullPath, "utf-8");
    expect(current).toContain("after-rotate");
    expect(current).not.toContain("xxxxx");
  });

  it("does not rotate a file below maxSizeBytes", () => {
    const t = makeTransport({ maxSizeBytes: 10 * 1024 * 1024 });
    t.log(entry({ message: "a" }));
    t.flush();
    t.log(entry({ message: "b" }));
    t.flush();
    const files = readdirSync(tmp).filter((f) => f.endsWith(".log"));
    expect(files).toHaveLength(1);
    expect(readFileSync(join(tmp, files[0]), "utf-8")).toContain("a");
    expect(readFileSync(join(tmp, files[0]), "utf-8")).toContain("b");
  });

  it("rotates under real write volume: rolled file keeps old content, active file restarts", () => {
    // Rotation is checked BEFORE each append: if the current file's size is
    // already >= maxSizeBytes it is renamed to <date>_all_<iso-ts>.<ext> and a
    // fresh active file is started by the append. So we exceed the limit with
    // one flush of real log entries, then flush again and observe the roll.
    const t = makeTransport({ maxSizeBytes: 256 });
    const big = "x".repeat(300); // one entry alone exceeds 256 bytes
    t.log(entry({ message: `first-${big}`, timestamp: "TS" }));
    t.flush(); // active .log is now oversized

    t.log(entry({ message: "second-after-roll", timestamp: "TS" }));
    t.flush(); // triggers rename, then appends to a fresh active file

    const logs = readdirSync(tmp).filter((f) => f.endsWith(".log"));
    const active = logs.filter((f) => /^\d{4}-\d{2}-\d{2}_all\.log$/.test(f));
    const rotated = logs.filter((f) =>
      /^\d{4}-\d{2}-\d{2}_all_\d{4}-\d{2}-\d{2}T[\d-]+Z\.log$/.test(f),
    );
    expect(active).toHaveLength(1);
    expect(rotated).toHaveLength(1);

    // Rolled file holds the pre-rotation content; active file restarted fresh.
    const rotatedContent = readFileSync(join(tmp, rotated[0]), "utf-8");
    expect(rotatedContent).toContain("first-");
    expect(rotatedContent).not.toContain("second-after-roll");
    const activeContent = readFileSync(join(tmp, active[0]), "utf-8");
    expect(activeContent).toBe("[TS] [INFO] second-after-roll\n");

    // The .md stream rotates independently by the same rule (the oversized
    // markdown file was also rolled, and a fresh active .md was started).
    const mds = readdirSync(tmp).filter((f) => f.endsWith(".md"));
    const activeMd = mds.filter((f) => /^\d{4}-\d{2}-\d{2}_all\.md$/.test(f));
    const rotatedMd = mds.filter((f) =>
      /^\d{4}-\d{2}-\d{2}_all_.+\.md$/.test(f),
    );
    expect(activeMd).toHaveLength(1);
    expect(rotatedMd).toHaveLength(1);
    expect(readFileSync(join(tmp, activeMd[0]), "utf-8")).toContain(
      "second-after-roll",
    );
    expect(readFileSync(join(tmp, activeMd[0]), "utf-8")).not.toContain(
      "first-",
    );
  });
});

describe("FileTransport: concurrent writes", () => {
  it("keeps every line intact and un-interleaved under many parallel log() calls", async () => {
    const t = makeTransport();
    const N = 250;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        Promise.resolve().then(() => {
          t.log(entry({ message: `line-${i}`, timestamp: "TS" }));
        }),
      ),
    );
    t.close(); // flushes whatever is buffered

    const logFile = readdirSync(tmp).find((f) => f.endsWith(".log"))!;
    const content = readFileSync(join(tmp, logFile), "utf-8");
    const lines = content.split("\n").filter((l) => l.length > 0);

    // All N lines present...
    expect(lines).toHaveLength(N);
    // ...each one whole (no interleaving/corruption)...
    for (const line of lines) {
      expect(line).toMatch(/^\[TS\] \[INFO\] line-\d+$/);
    }
    // ...and every index appears exactly once.
    const seen = new Set(
      lines.map((l) => Number(l.slice("[TS] [INFO] line-".length))),
    );
    expect(seen.size).toBe(N);
    for (let i = 0; i < N; i++) expect(seen.has(i)).toBe(true);
  });
});

describe("FileTransport: failure path (unwritable location)", () => {
  // NOTE: FileTransport does NOT swallow filesystem errors — the real behavior
  // is that the sync fs calls throw. These tests pin that down. The parent of
  // the target dir is a FILE, so mkdir/open fails deterministically (ENOTDIR)
  // regardless of uid/chmod semantics.

  it("constructor throws ENOTDIR when enabled and the dir's parent is a file", () => {
    const blocker = join(tmp, "blocker");
    writeFileSync(blocker, "i am a file, not a directory");
    let caught: unknown;
    try {
      new FileTransport({
        enabled: true,
        dir: join(blocker, "logs"),
        bufferFlushMs: 0,
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect((caught as NodeJS.ErrnoException).code).toBe("ENOTDIR");
  });

  it("constructor does NOT touch the unwritable path when disabled (graceful no-op)", () => {
    const blocker = join(tmp, "blocker");
    writeFileSync(blocker, "file");
    const t = new FileTransport({
      enabled: false,
      dir: join(blocker, "logs"),
      bufferFlushMs: 0,
    });
    t.log(entry());
    t.flush();
    t.close(); // none of these throw; nothing was created
    expect(readdirSync(tmp)).toEqual(["blocker"]);
  });

  it("flush throws if the dir becomes unwritable, retains the buffer, and recovers once writable again", () => {
    const dir = join(tmp, "logs");
    const t = new FileTransport({ enabled: true, dir, bufferFlushMs: 0 });
    t.log(entry({ message: "survivor", timestamp: "TS" }));

    // Replace the directory with a FILE so append's parent lookup fails.
    rmSync(dir, { recursive: true, force: true });
    writeFileSync(dir, "now a file");

    let caught: unknown;
    try {
      t.flush();
    } catch (e) {
      caught = e;
    }
    expect((caught as NodeJS.ErrnoException).code).toBe("ENOTDIR");

    // The throw happened before the buffer was cleared, so the entries are
    // retained: restore the directory and flush again — the data lands.
    rmSync(dir, { force: true });
    mkdirSync(dir, { recursive: true });
    t.flush();
    const logFile = readdirSync(dir).find((f) => f.endsWith(".log"))!;
    expect(readFileSync(join(dir, logFile), "utf-8")).toBe(
      "[TS] [INFO] survivor\n",
    );
  });
});
