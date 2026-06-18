// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

export interface Organizations {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}

export type NewOrganizations = {
  name: string;
  slug: string;
};

export type UpdateOrganizations = Partial<Omit<Organizations, 'id'>>;
