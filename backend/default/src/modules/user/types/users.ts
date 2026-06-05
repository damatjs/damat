// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

export interface Users {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}

export type NewUsers = {
  email: string;
  emailVerified?: boolean;
  name?: string | null;
  image?: string | null;
};

export type UpdateUsers = Partial<Omit<Users, 'id'>>;
