import type { Context } from "@damatjs/deps/hono";

export type RouteHandler = (c: Context) => Promise<Response> | Response;
