import { getPostgresPool } from '../db/postgres.js';
const EMBEDDING_SIZE = 768;
class VectorServiceError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
async function embedText(text, taskType) {
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
    const result = await response.json();
    if (typeof result !== 'object' ||
        result === null ||
        !('embedding' in result) ||
        typeof result.embedding !== 'object' ||
        result.embedding === null ||
        !('values' in result.embedding) ||
        !Array.isArray(result.embedding.values) ||
        result.embedding.values.length !== EMBEDDING_SIZE ||
        !result.embedding.values.every((value) => typeof value === 'number' && Number.isFinite(value))) {
        throw new VectorServiceError('Gemini returned an invalid transcript embedding.', 502);
    }
    return result.embedding.values;
}
function toTranscriptRecord(row) {
    return {
        sessionId: row.session_id,
        role: row.role,
        text: row.transcript,
        timestamp: new Date(row.created_at).toISOString()
    };
}
function serializeVector(vector) {
    if (vector.length !== EMBEDDING_SIZE || !vector.every(Number.isFinite)) {
        throw new VectorServiceError('Cannot store an invalid transcript embedding.', 502);
    }
    return `[${vector.join(',')}]`;
}
export async function storeTranscript(ownerId, sessionId, role, text) {
    const vector = await embedText(text, 'RETRIEVAL_DOCUMENT');
    await getPostgresPool().query(`INSERT INTO public.transcript_embeddings (owner_id, session_id, role, transcript, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`, [ownerId, sessionId, role, text, serializeVector(vector)]);
}
export async function findSimilarTranscripts(ownerId, text, limit = 5) {
    const vector = await embedText(text, 'RETRIEVAL_QUERY');
    const result = await getPostgresPool().query(`SELECT session_id, role, transcript, created_at,
            1 - (embedding <=> $3::vector) AS similarity
     FROM public.transcript_embeddings
     WHERE owner_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`, [ownerId, serializeVector(vector), limit]);
    return result.rows.map((row) => ({
        ...toTranscriptRecord(row),
        score: Number(row.similarity)
    }));
}
export async function getSessionTranscripts(ownerId, sessionId) {
    const result = await getPostgresPool().query(`SELECT session_id, role, transcript, created_at
     FROM public.transcript_embeddings
     WHERE owner_id = $1 AND session_id = $2
     ORDER BY created_at, id`, [ownerId, sessionId]);
    return result.rows.map(toTranscriptRecord);
}
