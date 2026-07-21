// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import type { Users } from "./users";

export interface Accounts {
  id: string;
  user_id: string;
  accountId: string;
  providerId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  idToken: string | null;
  password: string | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  // loaded relations
  user?: Users;
}

export type NewAccounts = {
  user_id: string;
  accountId: string;
  providerId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
  idToken?: string | null;
  password?: string | null;
};

export type UpdateAccounts = Partial<Omit<Accounts, "id">>;
