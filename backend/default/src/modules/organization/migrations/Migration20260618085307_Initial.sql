-- Migration: Initial
-- Module: organization
-- Created: 2026-06-18T08:53:07.190Z
--
-- Baseline migration for module "organization" (1 table(s))
--
-- This migration was auto-generated based on schema changes.
-- Review the SQL statements before running in production.

CREATE TABLE IF NOT EXISTS "public"."organizations" (
  "id" TEXT PRIMARY KEY DEFAULT generate_id('org'),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "created_at" DATE NOT NULL DEFAULT now(),
  "updated_at" DATE NULL,
  "deleted_at" DATE NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug" ON "public"."organizations" ("slug");
