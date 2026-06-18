// This file is auto-generated. Do not edit it manually.
// Re-generate by running: bun run codegen

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}

export type NewUserOrganization = {
  user_id: string;
  organization_id: string;
};

export type UpdateUserOrganization = Partial<Omit<UserOrganization, 'id'>>;
