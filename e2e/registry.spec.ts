import registry from "../apps/registry/data/registry.json";
import { expect, test } from "@playwright/test";
import { assertAccessible, assertDocument, assertMetadata } from "./support";

const base = "http://127.0.0.1:3031";
const staticRoutes = [
  "/",
  "/security",
  "/hosting",
  "/agents",
  "/modules",
  "/publish",
];

test.describe("registry site", () => {
  for (const route of staticRoutes) {
    test(`page renders: ${route}`, async ({ page }) => {
      await assertDocument(page, `${base}${route}`);
    });
  }

  for (const key of Object.keys(registry.modules)) {
    test(`module renders: ${key}`, async ({ page }) => {
      await assertDocument(page, `${base}/modules/${key}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(key);
    });
  }

  test("module search and trust filters update the catalog", async ({
    page,
  }) => {
    await page.goto(`${base}/modules`);
    const search = page.getByRole("textbox", { name: "Search modules" });
    await search.fill("billing");
    await expect(page.getByText("1 of 2 modules")).toBeVisible();
    await expect(page.getByRole("link", { name: /billing/ })).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await page.getByRole("button", { name: "Verified" }).click();
    await expect(page.getByText("1 of 2 modules")).toBeVisible();
    await page.getByRole("button", { name: "Community" }).click();
    await expect(page.getByText("1 of 2 modules")).toBeVisible();
  });

  test("machine index matches the rendered source", async ({ request }) => {
    const response = await request.get(`${base}/index.json`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toEqual({ modules: registry.modules });
  });

  test("metadata endpoints and representative accessibility pass", async ({
    page,
    request,
  }) => {
    await assertMetadata(request, base);
    await page.goto(`${base}/modules`);
    await assertAccessible(page);
  });

  test("unknown module is a real 404", async ({ page }) => {
    const response = await page.goto(`${base}/modules/not/a-real-module`);
    expect(response?.status()).toBe(404);
  });
});
