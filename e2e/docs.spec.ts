import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { assertAccessible, assertDocument, assertMetadata } from "./support";

const base = "http://127.0.0.1:3030";
interface GuideMap {
  guide: Array<{ chapters: Array<{ slug: string; title: string }> }>;
}
const guide = JSON.parse(readFileSync("docs/guide.json", "utf8")) as GuideMap;
const chapters = guide.guide.flatMap((section) => section.chapters);

test.describe("documentation site", () => {
  test("root redirects to the guide", async ({ page }) => {
    await assertDocument(page, base);
    await expect(page).toHaveURL(`${base}/docs`);
  });

  test("guide index renders", async ({ page }) => {
    await assertDocument(page, `${base}/docs`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "The Damat Guide",
    );
  });

  for (const chapter of chapters) {
    test(`chapter renders: ${chapter.slug}`, async ({ page }) => {
      await assertDocument(page, `${base}/docs/${chapter.slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        chapter.title,
      );
    });
  }

  test("search opens, filters, and navigates", async ({ page }) => {
    await page.goto(`${base}/docs`);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Search documentation" });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Search the docs…").fill("providers");
    await dialog.getByRole("button", { name: /Integration providers/ }).click();
    await expect(page).toHaveURL(`${base}/docs/providers`);
  });

  test("metadata endpoints and representative accessibility pass", async ({
    page,
    request,
  }) => {
    await assertMetadata(request, base, "/docs/og?title=Browser%20audit");
    await page.goto(`${base}/docs/providers`);
    await assertAccessible(page);
  });

  test("unknown chapter is a real 404", async ({ page }) => {
    const response = await page.goto(`${base}/docs/not-a-real-chapter`);
    expect(response?.status()).toBe(404);
  });
});
