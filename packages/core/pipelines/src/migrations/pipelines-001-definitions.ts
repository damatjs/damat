export const pipelines001DefinitionsSql = `
CREATE TABLE "_damat_pipeline_definitions" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "active_version_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "_damat_pipeline_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_pipeline_definitions_name_key" UNIQUE ("name"),
  CONSTRAINT "_damat_pipeline_definitions_source_check"
    CHECK ("source" IN ('code','web'))
);

CREATE TABLE "_damat_pipeline_versions" (
  "id" UUID NOT NULL,
  "definition_id" UUID NOT NULL,
  "source_version" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "manifest" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'published',
  "actor" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "_damat_pipeline_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_pipeline_versions_definition_fkey" FOREIGN KEY
    ("definition_id") REFERENCES "_damat_pipeline_definitions"("id") ON DELETE CASCADE,
  CONSTRAINT "_damat_pipeline_versions_source_key"
    UNIQUE ("definition_id","source_version"),
  CONSTRAINT "_damat_pipeline_versions_status_check"
    CHECK ("status" IN ('published','deprecated'))
);
ALTER TABLE "_damat_pipeline_definitions"
  ADD CONSTRAINT "_damat_pipeline_definitions_active_fkey" FOREIGN KEY ("active_version_id")
  REFERENCES "_damat_pipeline_versions"("id") ON DELETE SET NULL;

CREATE TABLE "_damat_pipeline_drafts" (
  "definition_id" UUID NOT NULL,
  "revision" BIGINT NOT NULL DEFAULT 1,
  "manifest" JSONB NOT NULL,
  "actor" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "_damat_pipeline_drafts_pkey" PRIMARY KEY ("definition_id"),
  CONSTRAINT "_damat_pipeline_drafts_definition_fkey" FOREIGN KEY
    ("definition_id") REFERENCES "_damat_pipeline_definitions"("id") ON DELETE CASCADE
);

CREATE TABLE "_damat_pipeline_layouts" (
  "id" UUID NOT NULL,
  "version_id" UUID NOT NULL,
  "revision" BIGINT NOT NULL,
  "layout" JSONB NOT NULL,
  "actor" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "_damat_pipeline_layouts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_pipeline_layouts_version_fkey" FOREIGN KEY
    ("version_id") REFERENCES "_damat_pipeline_versions"("id") ON DELETE CASCADE,
  CONSTRAINT "_damat_pipeline_layouts_revision_key" UNIQUE ("version_id","revision")
);
`;
