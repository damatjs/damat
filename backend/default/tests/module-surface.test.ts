import { describe, it, expect } from "bun:test";

import userModule, { USER_MODULE, UserModuleService } from "@/modules/user";
import orgModule, {
  ORGANIZATION_MODULE,
  OrganizationModuleService,
} from "@/modules/organization";

import { models as userModels } from "@/modules/user/service";
import { models as orgModels } from "@/modules/organization/service";

import linkModule, { links as allLinks } from "@/links";
import { links as userLinks, models as userLinkModels } from "@/links/user";
import userOrganizationLink from "@/links/user/models/user-organization";

// Auto-generated type barrels + zod for the organization module (the user
// equivalents are already exercised by models/zod tests).
import * as orgTypes from "@/modules/organization/types";
import {
  newOrganizationsSchema,
  updateOrganizationsSchema,
  OrganizationsQuerySchema,
  OrganizationsIdSchema,
  OrganizationsParamsSchema,
} from "@/modules/organization/types/organizations.zod";

// Pure type modules (`organizations.ts`, `*.links.ts`, `registry.ts`, the user
// `*.ts` interface files) compile to runtime no-ops; importing the barrels above
// pulls them in. We import the workflow barrels directly to register them too.
import * as workflowsBarrel from "@/workflows";
import * as userWorkflowsBarrel from "@/workflows/user";

describe("modules › user module definition", () => {
  it("exposes the module name and the result of defineModule()", () => {
    expect(USER_MODULE).toBe("user");
    expect(typeof userModule.init).toBe("function");
    expect(typeof UserModuleService).toBe("function");
    expect(Object.keys(userModels).length).toBeGreaterThan(0);
  });
});

describe("modules › organization module definition", () => {
  it("exposes the module name and the result of defineModule()", () => {
    expect(ORGANIZATION_MODULE).toBe("organization");
    expect(typeof orgModule.init).toBe("function");
    expect(typeof OrganizationModuleService).toBe("function");
    expect(Object.keys(orgModels)).toContain("organizations");
  });
});

describe("links › user→organization", () => {
  it("aggregates the user-owned links into the link module", () => {
    expect(typeof linkModule.init).toBe("function");
    expect(allLinks).toEqual(userLinks);
    expect(allLinks).toContain(userOrganizationLink);
  });

  it("collects junction models for migration discovery", () => {
    expect(userLinkModels).toBeDefined();
    expect(userOrganizationLink).toBeDefined();
  });
});

describe("types › organization zod + barrels", () => {
  it("re-exports the organization type surface via the barrel", () => {
    expect(orgTypes.newOrganizationsSchema).toBe(newOrganizationsSchema);
  });

  it("validates new/update/query/id/params schemas", () => {
    expect(
      newOrganizationsSchema.safeParse({ name: "n", slug: "s" }).success,
    ).toBe(true);
    expect(newOrganizationsSchema.safeParse({ name: "n" }).success).toBe(false);
    expect(updateOrganizationsSchema.safeParse({}).success).toBe(true);
    expect(
      OrganizationsQuerySchema.safeParse({ orderDir: "asc", limit: "2" })
        .success,
    ).toBe(true);
    expect(
      OrganizationsQuerySchema.safeParse({ orderDir: "nope" }).success,
    ).toBe(false);
    expect(OrganizationsIdSchema.safeParse("org_1").success).toBe(true);
    expect(OrganizationsParamsSchema.safeParse({ id: "org_1" }).success).toBe(
      true,
    );
    expect(
      OrganizationsParamsSchema.safeParse({ id: "x", extra: 1 }).success,
    ).toBe(false);
  });
});

describe("workflows › barrels", () => {
  it("re-export the user onboarding workflow + steps", () => {
    expect(workflowsBarrel.userOnboardingWorkflow).toBeDefined();
    expect(userWorkflowsBarrel.userOnboardingWorkflow).toBeDefined();
    expect(userWorkflowsBarrel.createProfileStep).toBeDefined();
  });
});
