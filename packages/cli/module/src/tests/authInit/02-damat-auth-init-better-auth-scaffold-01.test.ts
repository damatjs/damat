import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { state, describe, test, expect, run, written } from "./context";

describe("damat auth init better-auth — scaffold", () => {
  test("the scaffolded models are valid Damat model source with the Better Auth tables", async () => {
    state.existsDefault = false;
    await run(["better-auth"]).result;
    const models = written("src/modules/auth/models/index.ts")!.content;
    for (const table of [
      'model("user"',
      'model("session"',
      'model("account"',
      'model("verification"',
    ]) {
      expect(models).toContain(table);
    }
    // session/account belong to user
    expect(models).toContain('columns.belongsTo("user")');
  });
});
