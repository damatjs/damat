// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import { z } from "@damatjs/deps/zod";

export const newSessionsSchema = z.object({
  user_id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().max(45).nullable().optional(),
  userAgent: z.string().nullable().optional(),
}).strict();

export type NewSessionsInput = z.infer<typeof newSessionsSchema>;

export const updateSessionsSchema = z.object({
  user_id: z.string().optional(),
  token: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
  userAgent: z.string().nullable().optional(),
}).strict();

export type UpdateSessionsInput = z.infer<typeof updateSessionsSchema>;

export const SessionsQuerySchema = z.object({
  id: z.string().optional(),
  user_id: z.string().optional(),
  token: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
  userAgent: z.string().nullable().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().nullable().optional(),
  deleted_at: z.coerce.date().nullable().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
}).strict();

export type SessionsQuery = z.infer<typeof SessionsQuerySchema>;

export const SessionsIdSchema = z.string();

export type SessionsId = z.infer<typeof SessionsIdSchema>;

export const SessionsParamsSchema = z.object({
  id: z.string(),
}).strict();

export type SessionsParams = z.infer<typeof SessionsParamsSchema>;
