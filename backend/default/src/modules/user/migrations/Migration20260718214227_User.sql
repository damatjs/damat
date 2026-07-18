-- Migration: User
-- Module: user
-- Created: 2026-07-18T21:42:27.197Z
--
-- 12 columns altered
--
-- This migration was auto-generated based on schema changes.
-- Review the SQL statements before running in production.

ALTER TABLE "public"."verifications" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."verifications" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."verifications" ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "public"."verifications" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."verifications" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING "deleted_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."sessions" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."sessions" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."sessions" ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "public"."sessions" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."sessions" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING "deleted_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."accounts" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."accounts" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."accounts" ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "public"."accounts" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."accounts" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING "deleted_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."users" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."users" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::TIMESTAMP WITH TIME ZONE;

ALTER TABLE "public"."users" ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "public"."users" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."users" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING "deleted_at"::TIMESTAMP WITH TIME ZONE;
