import { describe, expect, it } from "bun:test";
import { createHealthRoute } from "../../handlers/health";

describe("health release identity", () => {
  it("uses the configured immutable release version", async () => {
    const route = createHealthRoute({ version: "1.0.0-beta.0" });
    const data = (await (await route.request("/health")).json()) as {
      version: string;
    };
    expect(data.version).toBe("1.0.0-beta.0");
  });

  it("reports unknown rather than a stale framework version", async () => {
    const route = createHealthRoute();
    const data = (await (await route.request("/health")).json()) as {
      version: string;
    };
    expect(data.version).toBe("unknown");
  });

  it("returns a valid ISO timestamp", async () => {
    const route = createHealthRoute();
    const data = (await (await route.request("/health")).json()) as {
      timestamp: string;
    };
    const timestamp = new Date(data.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
