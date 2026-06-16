import { ZodError } from '@damatjs/deps/zod';
import { ValidationError } from '@damatjs/types';
import type { MiddlewareHandler } from "@damatjs/deps/hono";
import type { RouteValidator } from '../router/types';

export function validate<T>(
    schema: { parse: (data: unknown) => T },
    data: unknown,
): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ValidationError("Validation failed", error.issues);
        }
        throw error;
    }
}

export type ValidationTarget = 'body' | 'query' | 'params' | 'json';


export function createValidatorMiddleware(handler: RouteValidator): MiddlewareHandler {
    return async (c, next) => {
        let data: { body?: unknown, query?: unknown, params?: unknown, json?: unknown } = {};

        if (c.req.method === 'GET' || c.req.method === 'DELETE') {
            data = {
                query: c.req.query(),
                params: c.req.param(),
            };
        } else {
            try {
                const body = await c.req.json();
                data = {
                    body,
                    json: body,
                    query: c.req.query(),
                    params: c.req.param(),
                };
            } catch {
                data = {
                    query: c.req.query(),
                    params: c.req.param(),
                };
            }
        }

        try {
            if (handler.body) {
                if (!data || data && !data.body) throw new ZodError([{
                    code: 'custom',
                    message: "Body is required",
                    path: ["body"],
                }]);
                handler.body.parse(data.body);
            }
            if (handler.query) {
                if (!data || data && !data.query) throw new ZodError([
                    {
                        code: 'custom',
                        message: "Query is required",
                        path: ["query"],
                    }]);
                handler.query.parse(data.query);
            }
            if (handler.params) {
                if (!data || data && !data.params) throw new ZodError([
                    {
                        code: 'custom',
                        message: "Params is required",
                        path: ["params"],
                    }]);
                handler.params.parse(data.params);
            }
            if (handler.json) {
                if (!data || data && !data.json) throw new ZodError([
                    {
                        code: 'custom',
                        message: "Json is required",
                        path: ["json"],
                    }]);
                const parsed = handler.json.parse(data.json);
                c.req.addValidatedData('json', parsed as object);
            }
        } catch (error) {
            if (error instanceof ZodError) {
                return c.json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Request validation failed',
                        details: error.issues.map(e => ({
                            path: e.path.join('.'),
                            message: e.message,
                        })),
                    },
                }, 400);
            }
            throw error;
        }

        return next();
    };
}
