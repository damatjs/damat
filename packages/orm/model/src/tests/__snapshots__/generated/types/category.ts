// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  created_at: Date;
  updated_at: Date | null;
}

export type NewCategory = {
  name: string;
  slug: string;
  description?: string | null;
};

export type UpdateCategory = Partial<Omit<Category, "id">>;
