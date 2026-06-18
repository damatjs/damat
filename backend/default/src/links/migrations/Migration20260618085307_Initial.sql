-- Migration: Initial
-- Module: link
-- Created: 2026-06-18T08:53:07.408Z
--
-- Baseline migration for module "link" (1 table(s))
--
-- This migration was auto-generated based on schema changes.
-- Review the SQL statements before running in production.

CREATE TABLE IF NOT EXISTS "public"."user_organization" (
  "id" TEXT PRIMARY KEY DEFAULT generate_id('link'),
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "created_at" DATE NOT NULL DEFAULT now(),
  "updated_at" DATE NULL,
  "deleted_at" DATE NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_organization_pair_uniq" ON "public"."user_organization" ("user_id", "organization_id");

CREATE INDEX IF NOT EXISTS "user_organization_user_id_idx" ON "public"."user_organization" ("user_id");

CREATE INDEX IF NOT EXISTS "user_organization_organization_id_idx" ON "public"."user_organization" ("organization_id");
