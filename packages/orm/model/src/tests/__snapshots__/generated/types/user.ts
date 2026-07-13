// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import type { Order } from "./order";

export interface User {
  id: string;
  email: string;
  name: string;
  age: number | null;
  verified: boolean;
  metadata: unknown | null;
  createdAt: Date;
  updatedAt: Date;
  created_at: Date;
  updated_at: Date | null;
  // loaded relations
  orders?: Order[];
}

export type NewUser = {
  email: string;
  name: string;
  age?: number | null;
  verified?: boolean;
  metadata?: unknown | null;
};

export type UpdateUser = Partial<Omit<User, "id">>;
