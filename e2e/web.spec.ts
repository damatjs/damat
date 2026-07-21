import { expect, test } from "@playwright/test";
import { assertAccessible, assertDocument, assertMetadata } from "./support";

const base = "http://127.0.0.1:3020";
const routes = ["/", "/about", "/community", "/modules", "/releases"];

test.describe("marketing site", () => {
  for (const route of routes) {
    test(`page renders: ${route}`, async ({ page }) => {
      await assertDocument(page, `${base}${route}`);
    });
  }

  test("internal navigation hydrates and changes routes", async ({ page }) => {
    await page.goto(base);
    await page
      .getByRole("link", { name: "Releases", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(`${base}/releases`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Every change, in lockstep.",
    );
  });

  test("theme choice persists across navigation", async ({ page }) => {
    await page.goto(base);
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.goto(`${base}/about`);
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("docs multi-zone serves the documentation app", async ({ page }) => {
    await assertDocument(page, `${base}/docs/providers`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Integration providers",
    );
  });

  test("registry path redirects to the configured registry", async ({
    request,
  }) => {
    const response = await request.get(`${base}/registry`, { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
    expect(response.headers().location).toBe("https://registry.damatjs.com/");
  });

  test("metadata endpoints and representative accessibility pass", async ({
    page,
    request,
  }) => {
    await assertMetadata(request, base);
    await page.goto(base);
    await assertAccessible(page);
  });

  test("unknown route renders the application 404", async ({ page }) => {
    const response = await page.goto(`${base}/not-a-real-route`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Page not found",
    );
  });
});
