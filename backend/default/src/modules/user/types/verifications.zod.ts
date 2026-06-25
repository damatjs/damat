// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import { z } from "@damatjs/deps/zod";

export const newVerificationsSchema = z.object({
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
}).strict();

export type NewVerificationsInput = z.infer<typeof newVerificationsSchema>;

export const updateVerificationsSchema = z.object({
  identifier: z.string().optional(),
  value: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
}).strict();

export type UpdateVerificationsInput = z.infer<typeof updateVerificationsSchema>;

export const VerificationsQuerySchema = z.object({
  id: z.string().optional(),
  identifier: z.string().optional(),
  value: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().nullable().optional(),
  deleted_at: z.coerce.date().nullable().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
}).strict();

export type VerificationsQuery = z.infer<typeof VerificationsQuerySchema>;

export const VerificationsIdSchema = z.string();

export type VerificationsId = z.infer<typeof VerificationsIdSchema>;

export const VerificationsParamsSchema = z.object({
  id: z.string(),
}).strict();

export type VerificationsParams = z.infer<typeof VerificationsParamsSchema>;
