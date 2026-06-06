-- Migration: Initial
-- Module: user
-- Created: 2026-06-06T10:17:51.562Z
--
-- Baseline migration for module "user" (4 table(s))
--
-- This migration was auto-generated based on schema changes.
-- Review the SQL statements before running in production.

CREATE TABLE IF NOT EXISTS "public"."verifications" (
  "id" TEXT PRIMARY KEY DEFAULT generate_id('vrf'),
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "created_at" DATE NOT NULL DEFAULT now(),
  "updated_at" DATE NULL,
  "deleted_at" DATE NULL
);

CREATE TABLE IF NOT EXISTS "public"."sessions" (
  "id" TEXT PRIMARY KEY DEFAULT generate_id('ses'),
  "user_id" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "ipAddress" CHARACTER VARYING(45) NULL,
  "userAgent" TEXT NULL,
  "created_at" DATE NOT NULL DEFAULT now(),
  "updated_at" DATE NULL,
  "deleted_at" DATE NULL
);

CREATE TABLE IF NOT EXISTS "public"."accounts" (
  "id" TEXT PRIMARY KEY DEFAULT generate_id('acc'),
  "user_id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "accessToken" TEXT NULL,
  "refreshToken" TEXT NULL,
  "accessTokenExpiresAt" TIMESTAMP WITHOUT TIME ZONE NULL,
  "refreshTokenExpiresAt" TIMESTAMP WITHOUT TIME ZONE NULL,
  "scope" TEXT NULL,
  "idToken" TEXT NULL,
  "password" TEXT NULL,
  "created_at" DATE NOT NULL DEFAULT now(),
  "updated_at" DATE NULL,
  "deleted_at" DATE NULL
);

CREATE TABLE IF NOT EXISTS "public"."users" (
  "id" TEXT PRIMARY KEY DEFAULT generate_id('usr'),
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NULL,
  "image" TEXT NULL,
  "created_at" DATE NOT NULL DEFAULT now(),
  "updated_at" DATE NULL,
  "deleted_at" DATE NULL
);

CREATE INDEX IF NOT EXISTS "verifications_identifier" ON "public"."verifications" ("identifier");

CREATE INDEX IF NOT EXISTS "sessions_token" ON "public"."sessions" ("token");

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "public"."sessions" ("user_id");

CREATE INDEX IF NOT EXISTS "accounts_accountId" ON "public"."accounts" ("accountId");

CREATE INDEX IF NOT EXISTS "accounts_providerId" ON "public"."accounts" ("providerId");

CREATE INDEX IF NOT EXISTS "accounts_providerId_accountId" ON "public"."accounts" ("providerId", "accountId");

CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "public"."accounts" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "users_email" ON "public"."users" ("email");

ALTER TABLE "public"."sessions" ADD CONSTRAINT "users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "public"."accounts" ADD CONSTRAINT "users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
