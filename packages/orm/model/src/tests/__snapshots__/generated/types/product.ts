// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

import type { ProductStatusEnum } from "./enums";
import type { Category } from "./category";

export interface Product {
  id: string;
  sku: string;
  title: string;
  price: number;
  stock: number;
  status: ProductStatusEnum;
  tags: Array<string> | null;
  specs: unknown | null;
  createdAt: Date;
  category_id: string | null;
  created_at: Date;
  updated_at: Date | null;
  // loaded relations
  category?: Category;
}

export type NewProduct = {
  sku: string;
  title: string;
  price: number;
  stock?: number;
  status: ProductStatusEnum;
  tags?: Array<string> | null;
  specs?: unknown | null;
  category_id?: string | null;
};

export type UpdateProduct = Partial<Omit<Product, "id">>;
