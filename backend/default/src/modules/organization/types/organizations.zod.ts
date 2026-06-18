// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import { z } from "@damatjs/deps/zod";

export const newOrganizationsSchema = z.object({
  name: z.string(),
  slug: z.string(),
}).strict();

export type NewOrganizationsInput = z.infer<typeof newOrganizationsSchema>;

export const updateOrganizationsSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
}).strict();

export type UpdateOrganizationsInput = z.infer<typeof updateOrganizationsSchema>;

export const OrganizationsQuerySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().nullable().optional(),
  deleted_at: z.coerce.date().nullable().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
}).strict();

export type OrganizationsQuery = z.infer<typeof OrganizationsQuerySchema>;

export const OrganizationsIdSchema = z.string();

export type OrganizationsId = z.infer<typeof OrganizationsIdSchema>;
