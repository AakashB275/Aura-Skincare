ALTER TABLE public.transcript_embeddings
  ADD COLUMN IF NOT EXISTS owner_id text;

CREATE INDEX IF NOT EXISTS transcript_embeddings_owner_session_created_idx
  ON public.transcript_embeddings (owner_id, session_id, created_at, id);
