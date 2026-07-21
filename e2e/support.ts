import AxeBuilder from "@axe-core/playwright";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export async function assertDocument(page: Page, url: string): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  expect(response, `No response for ${url}`).not.toBeNull();
  expect(response?.status(), `Bad response for ${url}`).toBeLessThan(400);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  expect(await page.title()).not.toBe("");
  const facts = await page.evaluate(() => {
    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map(
      (element) => element.id,
    );
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const jsonLd = [
      ...document.querySelectorAll("script[type='application/ld+json']"),
    ];
    const validJsonLd = jsonLd.every((script) => {
      try {
        JSON.parse(script.textContent ?? "");
        return true;
      } catch {
        return false;
      }
    });
    return {
      duplicateIds,
      lang: document.documentElement.lang,
      missingAlt: document.querySelectorAll("img:not([alt])").length,
      overflow: document.documentElement.scrollWidth - innerWidth,
      validJsonLd,
    };
  });
  expect(facts).toMatchObject({
    duplicateIds: [],
    lang: "en",
    missingAlt: 0,
    validJsonLd: true,
  });
  expect(facts.overflow).toBeLessThanOrEqual(1);
  await page.waitForTimeout(50);
  expect(errors, `Browser errors for ${url}`).toEqual([]);
}

export async function assertAccessible(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map(({ id, nodes }) => ({
    id,
    count: nodes.length,
    targets: nodes.slice(0, 5).flatMap((node) => node.target),
  }));
  expect(summary).toEqual([]);
}

export async function assertMetadata(
  request: APIRequestContext,
  base: string,
  ogPath = "/og?title=Browser%20audit",
): Promise<void> {
  const [robots, sitemap, og] = await Promise.all([
    request.get(`${base}/robots.txt`),
    request.get(`${base}/sitemap.xml`),
    request.get(`${base}${ogPath}`),
  ]);
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("User-Agent");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("<urlset");
  expect(og.ok()).toBe(true);
  expect(og.headers()["content-type"]).toContain("image/png");
}
