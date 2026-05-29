// import { describe, it, expect, beforeEach } from "bun:test";
// import { defineModule } from "../../module/define";
// import { z } from "@damatjs/deps/zod";

// describe("defineModule", () => {
//   const originalEnv = { ...process.env };

//   beforeEach(() => {
//     process.env = { ...originalEnv };
//   });

//   describe("with valid credentials", () => {
//     it("creates module instance with correct name", () => {
//       const TestSchema = z.object({
//         apiKey: z.string(),
//       });

//       const module = defineModule("test", {
//         credentials: {
//           schema: TestSchema,
//           load: (env) => ({
//             apiKey: env.TEST_API_KEY || "default-key",
//           }),
//         },
//         service: class TestService {
//           constructor(public credentials: { apiKey: string }) {}
//           getData() {
//             return `Data with key: ${this.credentials.apiKey}`;
//           }
//         },
//       });

//       expect(module.name).toBe("test");
//     });

//     it("initializes service with parsed credentials", () => {
//       const TestSchema = z.object({
//         apiKey: z.string(),
//       });

//       const module = defineModule("test", {
//         credentials: {
//           schema: TestSchema,
//           load: () => ({
//             apiKey: "test-key",
//           }),
//         },
//         service: class TestService {
//           constructor(public credentials: { apiKey: string }) {}
//           getApiKey() {
//             return this.credentials.apiKey;
//           }
//         },
//       });

//       expect(module.service.getApiKey()).toBe("test-key");
//     });

//     it("provides proxy access to service methods", () => {
//       const TestSchema = z.object({
//         value: z.number(),
//       });

//       const module = defineModule("test", {
//         credentials: {
//           schema: TestSchema,
//           load: () => ({ value: 42 }),
//         },
//         service: class TestService {
//           constructor(public credentials: { value: number }) {}
//           getValue() {
//             return this.credentials.value;
//           }
//           add(a: number, b: number) {
//             return a + b;
//           }
//         },
//       });

//       expect(module.service.getValue()).toBe(42);
//       expect(module.service.add(1, 2)).toBe(3);
//     });
//   });

//   describe("credential validation", () => {
//     it("throws on invalid credentials", () => {
//       const TestSchema = z.object({
//         port: z.number().min(1).max(65535),
//       });

//       expect(() => {
//         defineModule("test", {
//           credentials: {
//             schema: TestSchema,
//             load: () => ({ port: 99999 }),
//           },
//           service: class TestService {
//             constructor(public credentials: { port: number }) {}
//           },
//         });
//       }).toThrow('Module "test" credentials validation failed');
//     });

//     it("validates required fields", () => {
//       const TestSchema = z.object({
//         required: z.string().min(1),
//       });

//       expect(() => {
//         defineModule("test", {
//           credentials: {
//             schema: TestSchema,
//             load: () => ({ required: "" }),
//           },
//           service: class TestService {
//             constructor(public credentials: { required: string }) {}
//           },
//         });
//       }).toThrow();
//     });
//   });

//   describe("lazy initialization", () => {
//     it("initializes service on first access", () => {
//       const TestSchema = z.object({
//         value: z.string(),
//       });

//       let instanceCount = 0;

//       const module = defineModule("test", {
//         credentials: {
//           schema: TestSchema,
//           load: () => ({ value: "test" }),
//         },
//         service: class TestService {
//           constructor(public credentials: { value: string }) {
//             instanceCount++;
//           }
//         },
//       });

//       expect(instanceCount).toBe(0);
//       module.service.credentials;
//       expect(instanceCount).toBe(1);
//     });

//     it("re-initializes service on init() call", () => {
//       const TestSchema = z.object({
//         value: z.string(),
//       });

//       let instanceCount = 0;

//       const module = defineModule("test", {
//         credentials: {
//           schema: TestSchema,
//           load: () => ({ value: "test" }),
//         },
//         service: class TestService {
//           constructor(public credentials: { value: string }) {
//             instanceCount++;
//           }
//         },
//       });

//       const initialCount = instanceCount;
//       module.init();
//       expect(instanceCount).toBe(initialCount + 1);
//     });
//   });
// });
