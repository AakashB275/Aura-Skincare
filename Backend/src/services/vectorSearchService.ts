import { getPostgresPool } from '../db/postgres.js';

const EMBEDDING_SIZE = 768;

export type TranscriptRole = 'caller' | 'candidate';

export type TranscriptRecord = {
  sessionId: string;
  role: TranscriptRole;
  text: string;
  timestamp: string;
};

export type SimilarTranscript = TranscriptRecord & {
  score: number;
};

class VectorServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function embedText(text: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new VectorServiceError('GEMINI_API_KEY (or GOOGLE_API_KEY) is required to generate transcript embeddings.', 503);
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: EMBEDDING_SIZE
    })
  });

  if (!response.ok) {
    throw new VectorServiceError(`Gemini embedding request failed (${response.status}): ${await response.text()}`, 502);
  }

  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('embedding' in result) ||
    typeof result.embedding !== 'object' ||
    result.embedding === null ||
    !('values' in result.embedding) ||
    !Array.isArray(result.embedding.values) ||
    result.embedding.values.length !== EMBEDDING_SIZE ||
    !result.embedding.values.every((value: unknown) => typeof value === 'number' && Number.isFinite(value))
  ) {
    throw new VectorServiceError('Gemini returned an invalid transcript embedding.', 502);
  }

  return result.embedding.values;
}

type TranscriptRow = {
  session_id: string;
  role: TranscriptRole;
  transcript: string;
  created_at: Date | string;
  similarity?: number;
};

function toTranscriptRecord(row: TranscriptRow): TranscriptRecord {
  return {
    sessionId: row.session_id,
    role: row.role,
    text: row.transcript,
    timestamp: new Date(row.created_at).toISOString()
  };
}

function serializeVector(vector: number[]): string {
  if (vector.length !== EMBEDDING_SIZE || !vector.every(Number.isFinite)) {
    throw new VectorServiceError('Cannot store an invalid transcript embedding.', 502);
  }
  return `[${vector.join(',')}]`;
}

export async function storeTranscript(
  ownerId: string,
  sessionId: string,
  role: TranscriptRole,
  text: string
): Promise<void> {
  const vector = await embedText(text, 'RETRIEVAL_DOCUMENT');
  await getPostgresPool().query(
    `INSERT INTO public.transcript_embeddings (owner_id, session_id, role, transcript, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`,
    [ownerId, sessionId, role, text, serializeVector(vector)]
  );
}

export async function findSimilarTranscripts(
  ownerId: string,
  text: string,
  limit = 5
): Promise<SimilarTranscript[]> {
  const vector = await embedText(text, 'RETRIEVAL_QUERY');
  const result = await getPostgresPool().query<TranscriptRow>(
    `SELECT session_id, role, transcript, created_at,
            1 - (embedding <=> $3::vector) AS similarity
     FROM public.transcript_embeddings
     WHERE owner_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [ownerId, serializeVector(vector), limit]
  );

  return result.rows.map((row) => ({
    ...toTranscriptRecord(row),
    score: Number(row.similarity)
  }));
}

export async function getSessionTranscripts(ownerId: string, sessionId: string): Promise<TranscriptRecord[]> {
  const result = await getPostgresPool().query<TranscriptRow>(
    `SELECT session_id, role, transcript, created_at
     FROM public.transcript_embeddings
     WHERE owner_id = $1 AND session_id = $2
     ORDER BY created_at, id`,
    [ownerId, sessionId]
  );

  return result.rows.map(toTranscriptRecord);
}