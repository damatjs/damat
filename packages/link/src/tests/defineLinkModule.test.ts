import { describe, test, expect } from "bun:test";
import { defineLinkModule } from "../defineLinkModule";
import { defineLink } from "../defineLink";

/**
 * defineLinkModule wraps a set of links as a defineModule-compatible instance.
 * The link service is constructed lazily (only on init/first access), and its
 * credentials loader returns `{}`, so building the descriptor needs no database
 * or environment — we assert the descriptor shape without booting the service.
 */
describe("defineLinkModule", () => {
  const link = defineLink(
    { module: "blog", model: "author", field: "authors" },
    { module: "store", model: "book", field: "books" },
  );

  test("produces a module instance registered under the default id 'link'", () => {
    const mod = defineLinkModule([link]);

    expect(mod.name).toBe("link");
    expect(typeof mod.init).toBe("function");
    // credentials loader ran eagerly and required nothing.
    expect(mod.credentials).toEqual({});
    // The service is exposed (lazily) as a proxy object.
    expect(mod.service).toBeDefined();
  });

  test("honours a custom registration id", () => {
    const mod = defineLinkModule([link], "link:custom");
    expect(mod.name).toBe("link:custom");
  });
});
