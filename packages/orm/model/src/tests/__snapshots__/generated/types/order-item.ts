// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import type { Order } from "./order";
import type { Product } from "./product";

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  order_id: string;
  product_id: string;
  created_at: Date;
  updated_at: Date | null;
  // loaded relations
  order?: Order;
  product?: Product;
}

export type NewOrderItem = {
  quantity: number;
  unitPrice: number;
  order_id: string;
  product_id: string;
};

export type UpdateOrderItem = Partial<Omit<OrderItem, "id">>;
