// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import type { OrdersEnum } from "./enums";

export interface Order {
  id: string;
  total: number;
  status: OrdersEnum;
  notes: string | null;
  placedAt: Date;
  created_at: Date;
  updated_at: Date | null;
}

export type NewOrder = {
  total: number;
  status: OrdersEnum;
  notes?: string | null;
  placedAt?: Date;
};

export type UpdateOrder = Partial<Omit<Order, "id">>;
