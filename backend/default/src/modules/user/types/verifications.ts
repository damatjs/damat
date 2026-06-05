// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

export interface Verifications {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}

export type NewVerifications = {
  identifier: string;
  value: string;
  expiresAt: Date;
};

export type UpdateVerifications = Partial<Omit<Verifications, 'id'>>;
