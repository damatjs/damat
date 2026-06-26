import { describe, it, expect } from "bun:test";
import type { LinkDraft } from "../module/helpers/link";
import {
  camelize,
  isReadyDraft,
  draftBlanks,
  renderLinkModel,
  renderOwnerIndex,
  renderAggregator,
} from "../module/helpers/linkTemplates";

function draft(overrides: Partial<LinkDraft> = {}): LinkDraft {
  return {
    owner: "user",
    name: "user-organization",
    status: "ready",
    from: { module: "user", model: "users", field: "users" },
    to: {
      module: "organization",
      model: "organizations",
      field: "organizations",
    },
    ...overrides,
  };
}

describe("camelize", () => {
  it("turns kebab/snake into camelCase identifiers", () => {
    expect(camelize("user-organization")).toBe("userOrganization");
    expect(camelize("user")).toBe("user");
    expect(camelize("a-b-c")).toBe("aBC");
  });
});

describe("isReadyDraft / draftBlanks", () => {
  it("is ready only when both endpoints name a module and model", () => {
    expect(isReadyDraft(draft())).toBe(true);
    expect(isReadyDraft(draft({ to: { module: "", model: "" } }))).toBe(false);
    expect(draftBlanks(draft({ to: { module: "", model: "" } }))).toEqual([
      "to.module",
      "to.model",
    ]);
    expect(draftBlanks(draft())).toEqual([]);
  });
});

describe("renderLinkModel", () => {
  it("emits a defineLink call with both endpoints", () => {
    const out = renderLinkModel(draft());
    expect(out).toContain('import { defineLink } from "@damatjs/framework";');
    expect(out).toContain('{ module: "user", model: "users", field: "users" }');
    expect(out).toContain(
      '{ module: "organization", model: "organizations", field: "organizations" }',
    );
    // No options object when none configured.
    expect(out).not.toContain("database:");
    expect(out).not.toContain("pivotTable:");
  });

  it("emits an options object only when pivotTable / foreignKeys are set", () => {
    const out = renderLinkModel(
      draft({ pivotTable: "user_org", foreignKeys: true }),
    );
    expect(out).toContain('pivotTable: "user_org"');
    expect(out).toContain("database: { foreignKeys: true }");
  });

  it("omits optional endpoint fields when absent", () => {
    const out = renderLinkModel(
      draft({
        from: { module: "user", model: "users" },
        to: { module: "organization", model: "organizations" },
      }),
    );
    expect(out).toContain('{ module: "user", model: "users" }');
    expect(out).not.toContain("field:");
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
