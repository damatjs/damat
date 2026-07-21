import { expect, test } from "bun:test";
import { createRootRoute } from "../../handlers/root";

test("development information reports the application release identity", async () => {
  const fileRouter = { routes: [] } as never;
  const route = createRootRoute(fileRouter, "sha-production");
  const response = await route.request("/damat");
  const data = (await response.json()) as {
    name: string;
    version: string;
    description: string;
  };
  expect(data).toMatchObject({
    name: "Damat.js Backend Infrastructure",
    version: "sha-production",
    description: "Composable backend infrastructure for Damat applications.",
  });
});
