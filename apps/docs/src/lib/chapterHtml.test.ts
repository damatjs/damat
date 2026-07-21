import { describe, expect, test } from "bun:test";
import { stripChapterTitle } from "./chapterHtml";

describe("stripChapterTitle", () => {
  test("removes one leading rendered Markdown h1", () => {
    expect(
      stripChapterTitle(
        '<h1 id="intro">Intro<a class="heading-anchor">#</a></h1>\n<p>Body</p>',
      ),
    ).toBe("<p>Body</p>");
  });

  test("does not remove later or lower-level headings", () => {
    expect(stripChapterTitle("<p>Lead</p><h1>Later</h1>")).toBe(
      "<p>Lead</p><h1>Later</h1>",
    );
    expect(stripChapterTitle("<h2>Section</h2>")).toBe("<h2>Section</h2>");
  });
});
