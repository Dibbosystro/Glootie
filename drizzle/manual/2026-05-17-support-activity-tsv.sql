-- Phase 2.3: support conversations, activity log, KB tsvector + trigger.
-- Run after `npm run db:push` has created the new tables. The push will
-- create kb_documents.content_tsv as text; this script converts it to a real
-- tsvector column, populates it, attaches a trigger, and adds a GIN index.
--
-- Safe to re-run (everything uses IF NOT EXISTS / OR REPLACE).

-- 1. Convert content_tsv to a real tsvector column if it's still text-typed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_documents' AND column_name = 'content_tsv' AND data_type = 'text'
  ) THEN
    ALTER TABLE kb_documents ALTER COLUMN content_tsv DROP DEFAULT;
    ALTER TABLE kb_documents
      ALTER COLUMN content_tsv TYPE tsvector
      USING to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_md, ''));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kb_documents' AND column_name = 'content_tsv'
  ) THEN
    ALTER TABLE kb_documents ADD COLUMN content_tsv tsvector;
  END IF;
END $$;

-- 2. Backfill any rows missing tsv.
UPDATE kb_documents
SET content_tsv = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_md, ''))
WHERE content_tsv IS NULL;

-- 3. Trigger keeps content_tsv in sync on every insert / update.
CREATE OR REPLACE FUNCTION kb_documents_tsv_refresh() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content_md, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_documents_tsv_trigger ON kb_documents;
CREATE TRIGGER kb_documents_tsv_trigger
BEFORE INSERT OR UPDATE OF title, content_md ON kb_documents
FOR EACH ROW EXECUTE FUNCTION kb_documents_tsv_refresh();

-- 4. GIN index on content_tsv for fast FTS lookup.
CREATE INDEX IF NOT EXISTS kb_documents_tsv_idx ON kb_documents USING GIN (content_tsv);

-- 5. Helpful index on activity_log for the Activity page (newest first by type).
CREATE INDEX IF NOT EXISTS activity_log_started_at_idx ON activity_log (started_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_type_started_at_idx ON activity_log (type, started_at DESC);

-- 6. Helpful index on support_messages by conversation + time.
CREATE INDEX IF NOT EXISTS support_messages_conversation_created_at_idx
  ON support_messages (conversation_id, created_at);
