import { describe, it, expect } from "bun:test";
import {
  defineAuthProvider,
  defineAuthAdapter,
  createAuthHandlers,
} from "../src/index";
import type { AuthProvider } from "../src/index";

describe("defineAuthProvider / defineAuthAdapter", () => {
  it("defineAuthProvider returns the provider unchanged and it works with createAuthHandlers", () => {
    const provider = defineAuthProvider({
      name: "my-idp",
      authenticate: async () => ({ id: "u1" }),
    });
    expect(provider.name).toBe("my-idp");
    const handlers = createAuthHandlers(provider);
    expect(typeof handlers.session).toBe("function");
  });

  it("defineAuthAdapter returns the factory unchanged; calling it builds a provider", async () => {
    const factory = defineAuthAdapter((options) =>
      defineAuthProvider({
        name: "custom",
        authenticate: async () => ({ id: String(options.userId) }),
      }),
    );
    const provider = (await factory({ userId: 42 })) as AuthProvider;
    expect(provider.name).toBe("custom");
    expect(await provider.authenticate({} as never)).toEqual({ id: "42" });
  });
});
