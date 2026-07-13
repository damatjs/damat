import { describe, test, expect, afterEach } from "bun:test";
import { defineLink } from "../defineLink";
import { LinkRegistry } from "../registry";
import { parseFields, pruneColumns } from "../graph";
import {
  resolveLinkedModule,
  setLinkModuleResolver,
  hasLinkModuleResolver,
} from "../resolver";

describe("parseFields", () => {
  test("splits dotted paths into a column/relation tree", () => {
    const tree = parseFields([
      "*",
      "organizations.name",
      "organizations.members.email",
    ]);
    expect(tree.columns.has("*")).toBe(true);
    const orgs = tree.children.get("organizations")!;
    expect(orgs).toBeDefined();
    expect(orgs.columns.has("name")).toBe(true);
    const members = orgs.children.get("members")!;
    expect(members.columns.has("email")).toBe(true);
  });
});

describe("pruneColumns", () => {
  test("keeps only requested columns (plus id and child keys)", () => {
    const tree = parseFields(["name", "organizations.x"]);
    const row = { id: "1", name: "a", secret: "s", organizations: [] };
    const pruned = pruneColumns(row, tree);
    expect(pruned).toEqual({ id: "1", name: "a", organizations: [] });
  });

  test("keeps everything when '*' is selected", () => {
    const tree = parseFields(["*"]);
    const row = { id: "1", name: "a", secret: "s" };
    expect(pruneColumns(row, tree)).toEqual(row);
  });

  test("keeps the model's REAL primary key, not a hardcoded 'id'", () => {
    // A model keyed on `sku` (not `id`). Pruning must retain the real PK and
    // must NOT force-add a stray `id` that leaked onto the row.
    const tree = parseFields(["name"]);
    const row = { sku: "S1", id: "stray", name: "Widget", secret: "s" };
    const pruned = pruneColumns(row, tree, "sku");
    expect(pruned).toEqual({ sku: "S1", name: "Widget" });
    expect(pruned.id).toBeUndefined();
  });
});

describe("LinkRegistry", () => {
  const link = defineLink(
    { module: "user", model: "user", field: "users" },
    { module: "organization", model: "organization", field: "organizations" },
  );
  const registry = new LinkRegistry([link]);

  test("resolves a pair in both orientations", () => {
    const forward = registry.resolve(
      { model: "user" },
      { model: "organization" },
    );
    expect(forward.fromColumn).toBe("user_id");
    expect(forward.toColumn).toBe("organization_id");

    const reverse = registry.resolve(
      { model: "organization" },
      { model: "user" },
    );
    expect(reverse.fromColumn).toBe("organization_id");
    expect(reverse.toColumn).toBe("user_id");
  });

  test("lists outgoing links by alias", () => {
    const outgoing = registry.linksFrom("user", "user");
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]!.other.alias).toBe("organizations");
  });

  test("throws for an undefined pair", () => {
    expect(() =>
      registry.resolve({ model: "user" }, { model: "ghost" }),
    ).toThrow(/No link defined/);
  });
});

describe("resolver", () => {
  afterEach(() => setLinkModuleResolver(undefined as any));

  test("throws when no resolver is wired", () => {
    setLinkModuleResolver(undefined as any);
    expect(hasLinkModuleResolver()).toBe(false);
    expect(() => resolveLinkedModule("user")).toThrow(/resolver not set/);
  });

  test("delegates to the injected resolver", () => {
    const stub = { marker: true };
    setLinkModuleResolver((id) => (id === "user" ? stub : null));
    expect(hasLinkModuleResolver()).toBe(true);
    expect(resolveLinkedModule("user")).toBe(stub);
    expect(() => resolveLinkedModule("missing")).toThrow(/not registered/);
  });
});
