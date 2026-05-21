import { describe, it, expect } from "bun:test";
import { ConnectionError } from "../../tools/error";

describe("ConnectionError", () => {
    it("should create error with message", () => {
        const error = new ConnectionError("Connection failed");
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ConnectionError);
        expect(error.message).toBe("Connection failed");
        expect(error.name).toBe("ConnectionError");
    });

    it("should create error with message and cause", () => {
        const cause = new Error("Original error");
        const error = new ConnectionError("Failed to connect", cause);
        expect(error.message).toBe("Failed to connect");
        expect(error.cause).toBe(cause);
    });

    it("should create error without cause", () => {
        const error = new ConnectionError("No cause provided");
        expect(error.cause).toBeUndefined();
    });

    it("should have correct name property", () => {
        const error = new ConnectionError("Test error");
        expect(error.name).toBe("ConnectionError");
    });

    it("should be catchable as generic Error", () => {
        const throwFn = () => {
            throw new ConnectionError("Throw test");
        };
        try {
            throwFn();
        } catch (e) {
            expect(e).toBeInstanceOf(Error);
            expect((e as Error).message).toBe("Throw test");
        }
    });
});
