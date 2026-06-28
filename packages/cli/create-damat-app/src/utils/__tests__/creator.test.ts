import {
  describe,
  it,
  expect,
  afterEach,
} from "bun:test";
import path from "path";
import {
  BaseProjectCreator,
  type ProjectOptions,
} from "../projectCreator/creator";

// A minimal concrete subclass to exercise the abstract BaseProjectCreator. The
// constructor wires up real spinner/process/package managers and an abort
// controller; none of those side-effect at construction time (no spawning).
class TestCreator extends BaseProjectCreator {
  protected showSuccessMessage(): void {}
  protected setupProcessManager(): void {}
  // expose protected members/methods for assertions
  callGetProjectPath(name: string) {
    return this.getProjectPath(name);
  }
  get path() {
    return this.projectPath;
  }
  get name() {
    return this.projectName;
  }
  get factBox() {
    return this.factBoxOptions;
  }
}

describe("BaseProjectCreator", () => {
  afterEach(() => {
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  const opts = (extra: Partial<ProjectOptions> = {}): ProjectOptions => ({
    directoryPath: "/base",
    ...extra,
  });

  it("should join directoryPath and projectName into projectPath", () => {
    const c = new TestCreator("my-app", opts(), ["my-app"]);
    expect(c.path).toBe(path.join("/base", "my-app"));
    expect(c.name).toBe("my-app");
  });

  it("should treat a non-string directoryPath as an empty base", () => {
    const c = new TestCreator("app", opts({ directoryPath: undefined as any }), []);
    expect(c.path).toBe(path.join("", "app"));
  });

  it("getProjectPath should join the configured directoryPath with the name", () => {
    const c = new TestCreator("app", opts({ directoryPath: "/work" }), []);
    expect(c.callGetProjectPath("sub")).toBe(path.join("/work", "sub"));
  });

  it("getProjectPath should default to empty base when directoryPath is nullish", () => {
    const c = new TestCreator("app", opts({ directoryPath: undefined as any }), []);
    expect(c.callGetProjectPath("sub")).toBe(path.join("", "sub"));
  });

  it("should seed factBoxOptions with verbose from options", () => {
    const c = new TestCreator("app", opts({ verbose: true }), []);
    expect(c.factBox.verbose).toBe(true);
    expect(c.factBox.interval).toBeNull();
  });

  it("should default factBoxOptions verbose to false", () => {
    const c = new TestCreator("app", opts(), []);
    expect(c.factBox.verbose).toBe(false);
  });
});
