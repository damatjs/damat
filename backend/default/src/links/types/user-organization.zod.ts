// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import { z } from "@damatjs/deps/zod";

export const newUserOrganizationSchema = z.object({
  user_id: z.string(),
  organization_id: z.string(),
}).strict();

export type NewUserOrganizationInput = z.infer<typeof newUserOrganizationSchema>;

export const updateUserOrganizationSchema = z.object({
  user_id: z.string().optional(),
  organization_id: z.string().optional(),
}).strict();

export type UpdateUserOrganizationInput = z.infer<typeof updateUserOrganizationSchema>;

export const UserOrganizationQuerySchema = z.object({
  id: z.string().optional(),
  user_id: z.string().optional(),
  organization_id: z.string().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().nullable().optional(),
  deleted_at: z.coerce.date().nullable().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
}).strict();

export type UserOrganizationQuery = z.infer<typeof UserOrganizationQuerySchema>;

export const UserOrganizationIdSchema = z.string();

export type UserOrganizationId = z.infer<typeof UserOrganizationIdSchema>;
