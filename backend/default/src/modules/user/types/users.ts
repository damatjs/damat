// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import type { Accounts } from "./accounts";
import type { Sessions } from "./sessions";

export interface Users {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  // loaded relations
  accounts?: Accounts[];
  sessions?: Sessions[];
}

export type NewUsers = {
  email: string;
  emailVerified?: boolean;
  name?: string | null;
  image?: string | null;
};

export type UpdateUsers = Partial<Omit<Users, 'id'>>;
