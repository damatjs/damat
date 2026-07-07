import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  mock,
} from "bun:test";
import path from "path";
import prepare from "../actions/prepareProject";
import ProcessManager from "../commands/manager";

import * as realFsMod from "fs";
import * as realFactsMod from "../commands/facts";
import * as realVersionsMod from "../package/versionsUpdater";

const REAL_FS = { ...realFsMod };
const REAL_FACTS = { ...realFactsMod };
const REAL_VERSIONS = { ...realVersionsMod };

// fs: capture written package.json + .env without touching disk.
let readFileImpl: (p: string, enc: string) => string = () =>
  JSON.stringify({ name: "old", dependencies: {} });
const readFileCalls: any[] = [];
const writeFileCalls: any[] = [];
const appendFileCalls: any[] = [];
const mockReadFileSync = mock((p: string, enc: string) => {
  readFileCalls.push([p, enc]);
  return readFileImpl(p, enc);
});
const mockWriteFileSync = mock((p: string, data: string) => {
  writeFileCalls.push([p, data]);
});
const mockAppendFileSync = mock((p: string, data: string) => {
  appendFileCalls.push([p, data]);
});

// facts.displayFactBox: return a fake interval handle, no timers.
const mockDisplayFactBox = mock((_o: any) => 123 as any);

// versionsUpdater: capture invocation.
const mockVersionsUpdate = mock((_pkg: any, _v: string) => {});

function makePackageManager(pmStr: string | undefined) {
  return {
    getPackageManagerString: mock(async () => pmStr),
    installDependencies: mock(async (_o: any) => {}),
  } as any;
}

function makeSpinner() {
  return {
    text: "",
    start: mock(() => {}),
    stop: mock(() => {}),
    success: mock(() => {}),
  } as any;
}

describe("prepareProject action", () => {
  let processManager: ProcessManager;

  beforeAll(() => {
    mock.module("fs", () => ({
      ...REAL_FS,
      default: {
        ...(REAL_FS as any).default,
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
        appendFileSync: mockAppendFileSync,
      },
      readFileSync: mockReadFileSync,
      writeFileSync: mockWriteFileSync,
      appendFileSync: mockAppendFileSync,
    }));
    mock.module("../commands/facts", () => ({
      ...REAL_FACTS,
      displayFactBox: mockDisplayFactBox,
    }));
    mock.module("../package/versionsUpdater", () => ({
      ...REAL_VERSIONS,
      PackageVersionsUpdate: mockVersionsUpdate,
    }));
  });

  afterAll(() => {
    mock.module("fs", () => ({ ...REAL_FS }));
    mock.module("../commands/facts", () => ({ ...REAL_FACTS }));
    mock.module("../package/versionsUpdater", () => ({ ...REAL_VERSIONS }));
  });

  beforeEach(() => {
    processManager = new ProcessManager();
    readFileImpl = () => JSON.stringify({ name: "old", dependencies: {} });
    readFileCalls.length = 0;
    writeFileCalls.length = 0;
    appendFileCalls.length = 0;
    mockReadFileSync.mockClear();
    mockWriteFileSync.mockClear();
    mockAppendFileSync.mockClear();
    mockDisplayFactBox.mockClear();
    mockVersionsUpdate.mockClear();
  });

  afterEach(() => {
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  describe("module branch (isModule: true)", () => {
    it("should set the name, set packageManager, install deps, and display fact boxes", async () => {
      const pm = makePackageManager("bun@1.3.11");
      const result = await prepare({
        isModule: true,
        directory: "/proj",
        projectName: "cool-mod",
        spinner: makeSpinner(),
        processManager,
        abortController: new AbortController(),
        packageManager: pm,
      });

      expect(result).toBeUndefined();
      // package.json read + written
      expect(mockReadFileSync.mock.calls[0]![0]).toBe(
        path.join("/proj", "package.json"),
      );
      const written = JSON.parse(writeFileCalls[0]![1]);
      expect(written.name).toBe("cool-mod");
      expect(written.packageManager).toBe("bun@1.3.11");
      expect(pm.installDependencies).toHaveBeenCalledTimes(1);
      // module branch does NOT write .env
      expect(mockAppendFileSync).not.toHaveBeenCalled();
      // create + 2 reset displayFactBox calls
      expect(mockDisplayFactBox).toHaveBeenCalledTimes(3);
    });

    it("should NOT add packageManager when the string is falsy", async () => {
      const pm = makePackageManager(undefined);
      await prepare({
        isModule: true,
        directory: "/proj",
        projectName: "m",
        spinner: makeSpinner(),
        processManager,
        packageManager: pm,
      });
      const written = JSON.parse(writeFileCalls[0]![1]);
      expect(written.packageManager).toBeUndefined();
    });
  });

  describe("project branch (isModule: false)", () => {
    it("should set name, write .env, install deps, and update versions when version given", async () => {
      const pm = makePackageManager("bun@1.3.11");
      const result = await prepare({
        isModule: false,
        directory: "/proj",
        projectName: "cool-app",
        spinner: makeSpinner(),
        processManager,
        abortController: new AbortController(),
        packageManager: pm,
        version: "2.0.0",
      });

      // project branch resolves to string | undefined (the function returns nothing)
      expect(result).toBeUndefined();
      const written = JSON.parse(writeFileCalls[0]![1]);
      expect(written.name).toBe("cool-app");
      expect(mockVersionsUpdate).toHaveBeenCalledTimes(1);
      expect(mockVersionsUpdate.mock.calls[0]![1]).toBe("2.0.0");

      // .env appended with the expected keys
      expect(mockAppendFileSync).toHaveBeenCalledTimes(1);
      const [envPath, envContent] = appendFileCalls[0]!;
      expect(envPath).toBe(path.join("/proj", ".env"));
      expect(envContent).toContain("FRONTEND_CORS=");
      expect(envContent).toContain("AUTH_CORS=");
      expect(envContent).toContain("REDIS_URL=redis://localhost:6379");
      // secrets are random (64 hex chars), never a hardcoded default
      expect(envContent).toMatch(/JWT_SECRET=[0-9a-f]{64}/);
      expect(envContent).toMatch(/COOKIE_SECRET=[0-9a-f]{64}/);
      expect(envContent).not.toContain("supersecret");
      // DATABASE_URL placeholder so the app fails with a clear connection
      // error instead of a missing-var crash
      expect(envContent).toContain(
        "DATABASE_URL=postgres://postgres:postgres@localhost:5432/cool_app",
      );
      expect(envContent).toContain("# Update DATABASE_URL");
      // FRONTEND_CORS should include the docs origin appended
      expect(envContent).toContain("https://docs.damat.com");
    });

    it("should generate a fresh secret per invocation", async () => {
      const pm = makePackageManager("bun@1.0.0");
      const run = () =>
        prepare({
          isModule: false,
          directory: "/proj",
          projectName: "app",
          spinner: makeSpinner(),
          processManager,
          packageManager: pm,
        });
      await run();
      await run();
      const first = appendFileCalls[0]![1].match(/JWT_SECRET=([0-9a-f]{64})/)![1];
      const second = appendFileCalls[1]![1].match(/JWT_SECRET=([0-9a-f]{64})/)![1];
      expect(first).not.toBe(second);
    });

    it("should NOT update versions when no version is provided", async () => {
      const pm = makePackageManager("bun@1.0.0");
      await prepare({
        isModule: false,
        directory: "/proj",
        projectName: "app",
        spinner: makeSpinner(),
        processManager,
        packageManager: pm,
      });
      expect(mockVersionsUpdate).not.toHaveBeenCalled();
    });

    it("should skip the packageManager field when string is falsy", async () => {
      const pm = makePackageManager(undefined);
      await prepare({
        isModule: false,
        directory: "/proj",
        projectName: "app",
        spinner: makeSpinner(),
        processManager,
        packageManager: pm,
        version: "1.0.0",
      });
      const written = JSON.parse(writeFileCalls[0]![1]);
      expect(written.packageManager).toBeUndefined();
    });
  });
});
