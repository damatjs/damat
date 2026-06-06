// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import { z } from "@damatjs/deps/zod";

export const newUsersSchema = z.object({
  email: z.string(),
  emailVerified: z.boolean().optional(),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
}).strict();

export type NewUsersInput = z.infer<typeof newUsersSchema>;

export const updateUsersSchema = z.object({
  email: z.string().optional(),
  emailVerified: z.boolean().optional(),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
}).strict();

export type UpdateUsersInput = z.infer<typeof updateUsersSchema>;

export const UsersQuerySchema = z.object({
  id: z.string().optional(),
  email: z.string().optional(),
  emailVerified: z.coerce.boolean().optional(),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().nullable().optional(),
  deleted_at: z.coerce.date().nullable().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
}).strict();

export type UsersQuery = z.infer<typeof UsersQuerySchema>;

export const UsersIdSchema = z.string();

export type UsersId = z.infer<typeof UsersIdSchema>;
