import { describe, it, expect } from "bun:test";
import {
  camelize,
  renderOwnerIndex,
  renderAggregator,
} from "../module/helpers/linkTemplates";

// NOTE: the filesystem scanners (listModelBasenames / listOwnerDirs) and the
// installModuleSplit copy logic touch real fs, which the package-wide
// `node:fs` mock in __tests__/setup.ts (loaded by the command tests) replaces
// process-wide. They are exercised against a real filesystem by
// scripts/verify-link-split.ts instead of here.

describe("camelize", () => {
  it("turns kebab/snake into camelCase identifiers", () => {
    expect(camelize("user-organization")).toBe("userOrganization");
    expect(camelize("user")).toBe("user");
    expect(camelize("a-b-c")).toBe("aBC");
  });
});

describe("renderOwnerIndex", () => {
  it("imports every model file and collects link models", () => {
    const out = renderOwnerIndex(["user-organization", "user-team"]);
    expect(out).toContain(
      'import { collectLinkModels } from "@damatjs/framework";',
    );
    expect(out).toContain(
      'import userOrganization from "./models/user-organization";',
    );
    expect(out).toContain('import userTeam from "./models/user-team";');
    expect(out).toContain("export const links = [userOrganization, userTeam];");
    expect(out).toContain("export const models = collectLinkModels(links);");
  });
});

describe("renderAggregator", () => {
  it("aggregates every owner directory into the link module", () => {
    const out = renderAggregator(["user", "billing-stripe"]);
    expect(out).toContain(
      'import { defineLinkModule } from "@damatjs/framework";',
    );
    expect(out).toContain('import { links as userLinks } from "./user";');
    expect(out).toContain(
      'import { links as billingStripeLinks } from "./billing-stripe";',
    );
    expect(out).toContain(
      "export const links = [...userLinks, ...billingStripeLinks];",
    );
    expect(out).toContain("export default defineLinkModule(links);");
  });
});
