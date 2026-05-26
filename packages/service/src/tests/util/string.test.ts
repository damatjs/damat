import { describe, it, expect } from "bun:test";
import { toCamelCase } from "../../util/string";

describe("toCamelCase", () => {
  it("converts first character to lowercase", () => {
    expect(toCamelCase("Hello")).toBe("hello");
    expect(toCamelCase("World")).toBe("world");
  });

  it("keeps remaining characters unchanged", () => {
    expect(toCamelCase("HelloWorld")).toBe("helloWorld");
    expect(toCamelCase("MyClass")).toBe("myClass");
    expect(toCamelCase("UserService")).toBe("userService");
  });

  it("handles already lowercase strings", () => {
    expect(toCamelCase("hello")).toBe("hello");
    expect(toCamelCase("world")).toBe("world");
  });

  it("handles empty string", () => {
    expect(toCamelCase("")).toBe("");
  });

  it("handles single character strings", () => {
    expect(toCamelCase("A")).toBe("a");
    expect(toCamelCase("z")).toBe("z");
  });

  it("handles strings with numbers", () => {
    expect(toCamelCase("User123")).toBe("user123");
    expect(toCamelCase("API2Service")).toBe("aPI2Service");
  });

  it("handles strings with special characters", () => {
    expect(toCamelCase("Hello_World")).toBe("hello_World");
    expect(toCamelCase("Test-Class")).toBe("test-Class");
  });
});
