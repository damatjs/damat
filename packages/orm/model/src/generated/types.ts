// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

export type product_status = 'draft' | 'active' | 'archived';
export type orders = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
}

export type NewCategory = {
  name: string;
  slug: string;
  description?: string | null;
};

export type UpdateCategory = Partial<Omit<Category, 'id'>>;

export interface Product {
  id: string;
  sku: string;
  title: string;
  price: number;
  stock: number;
  status: product_status;
  tags: Array<string> | null;
  specs: unknown | null;
  createdAt: Date;
  category_id: string | null;
  // loaded relations
  category?: Category;
}

export type NewProduct = {
  sku: string;
  title: string;
  price: number;
  stock?: number;
  status: product_status;
  tags?: Array<string> | null;
  specs?: unknown | null;
  category_id?: string | null;
};

export type UpdateProduct = Partial<Omit<Product, 'id'>>;

export interface Order {
  id: string;
  total: number;
  status: orders;
  notes: string | null;
  placedAt: Date;
}

export type NewOrder = {
  total: number;
  status: orders;
  notes?: string | null;
  placedAt?: Date;
};

export type UpdateOrder = Partial<Omit<Order, 'id'>>;

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  order_id: string;
  product_id: string;
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

export type UpdateOrderItem = Partial<Omit<OrderItem, 'id'>>;

export interface User {
  id: string;
  email: string;
  name: string;
  age: number | null;
  verified: boolean;
  metadata: unknown | null;
  createdAt: Date;
  updatedAt: Date;
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

export type UpdateUser = Partial<Omit<User, 'id'>>;
