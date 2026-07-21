// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import type { Users } from "./users";

export interface Sessions {
  id: string;
  user_id: string;
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  // loaded relations
  user?: Users;
}

export type NewSessions = {
  user_id: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type UpdateSessions = Partial<Omit<Sessions, "id">>;
