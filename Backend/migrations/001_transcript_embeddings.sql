CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.transcript_embeddings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('caller', 'candidate')),
  transcript text NOT NULL,
  embedding vector(768) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transcript_embeddings_session_created_idx
  ON public.transcript_embeddings (session_id, created_at, id);
