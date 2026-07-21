import { describe, expect, test } from "bun:test";
import { parseReleaseNote, versionFromFilename } from "./release-note";

describe("release notes", () => {
  test("recognizes prerelease filenames", () => {
    expect(versionFromFilename("1.0.0-beta.0.md")).toBe("1.0.0-beta.0");
    expect(versionFromFilename("next.md")).toBeNull();
  });

  test("removes a prerelease version from the package heading", () => {
    const note = parseReleaseNote(
      "framework",
      "1.0.0-beta.0",
      "# @damatjs/framework 1.0.0-beta.0\n\n> Early launch.",
    );
    expect(note.npmName).toBe("@damatjs/framework");
    expect(note.summary).toBe("Early launch.");
  });
});
