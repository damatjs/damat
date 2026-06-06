// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import { z } from "@damatjs/deps/zod";

export const newAccountsSchema = z.object({
  user_id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().nullable().optional(),
  refreshToken: z.string().nullable().optional(),
  accessTokenExpiresAt: z.coerce.date().nullable().optional(),
  refreshTokenExpiresAt: z.coerce.date().nullable().optional(),
  scope: z.string().nullable().optional(),
  idToken: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
}).strict();

export type NewAccountsInput = z.infer<typeof newAccountsSchema>;

export const updateAccountsSchema = z.object({
  user_id: z.string().optional(),
  accountId: z.string().optional(),
  providerId: z.string().optional(),
  accessToken: z.string().nullable().optional(),
  refreshToken: z.string().nullable().optional(),
  accessTokenExpiresAt: z.coerce.date().nullable().optional(),
  refreshTokenExpiresAt: z.coerce.date().nullable().optional(),
  scope: z.string().nullable().optional(),
  idToken: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
}).strict();

export type UpdateAccountsInput = z.infer<typeof updateAccountsSchema>;

export const AccountsQuerySchema = z.object({
  id: z.string().optional(),
  user_id: z.string().optional(),
  accountId: z.string().optional(),
  providerId: z.string().optional(),
  accessToken: z.string().nullable().optional(),
  refreshToken: z.string().nullable().optional(),
  accessTokenExpiresAt: z.coerce.date().nullable().optional(),
  refreshTokenExpiresAt: z.coerce.date().nullable().optional(),
  scope: z.string().nullable().optional(),
  idToken: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().nullable().optional(),
  deleted_at: z.coerce.date().nullable().optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
}).strict();

export type AccountsQuery = z.infer<typeof AccountsQuerySchema>;

export const AccountsIdSchema = z.string();

export type AccountsId = z.infer<typeof AccountsIdSchema>;
