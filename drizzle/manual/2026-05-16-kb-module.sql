-- Phase 2.1: KB module tables for Glootie support.
-- Run this once in Neon SQL editor against the Glootie database, OR run
-- `npm run db:push` locally after pulling DATABASE_URL via `vercel env pull`.
--
-- Safe to re-run (CREATE TABLE IF NOT EXISTS, IF NOT EXISTS on index).

CREATE TABLE IF NOT EXISTS kb_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  title           text NOT NULL,
  content_md      text NOT NULL,
  current_version integer NOT NULL DEFAULT 1,
  updated_by      text NOT NULL DEFAULT 'system',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_client_slug_uq
  ON kb_documents (client_id, slug);

CREATE TABLE IF NOT EXISTS kb_document_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  version     integer NOT NULL,
  content_md  text NOT NULL,
  editor      text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_document_versions_document_idx
  ON kb_document_versions (document_id, version DESC);
