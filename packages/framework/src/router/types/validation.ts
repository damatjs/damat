import type { z } from "@damatjs/deps/zod";
import type { HttpMethod } from "./http";

export type ZodSchema = z.ZodType<any, any>;

export interface RouteValidator {
  method: HttpMethod;
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  json?: ZodSchema;
}
