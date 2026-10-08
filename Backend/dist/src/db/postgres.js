import { Pool } from 'pg';
let pool;
export function getPostgresPool() {
    if (pool) {
        return pool;
    }
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        throw new Error('POSTGRES_URL is required to connect to transcript storage.');
    }
    pool = new Pool({ connectionString });
    pool.on('error', (error) => {
        console.error('Unexpected PostgreSQL pool error:', error.message);
    });
    return pool;
}
export async function verifyTranscriptStorage() {
    const result = await getPostgresPool().query(`
    SELECT
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector_extension,
      to_regclass('public.transcript_embeddings') AS transcript_table,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transcript_embeddings'
          AND column_name = 'owner_id'
      ) AS owner_column
  `);
    const storage = result.rows[0];
    if (!storage?.vector_extension || !storage.transcript_table || !storage.owner_column) {
        throw new Error('Transcript storage is not initialized. Apply the transcript storage migrations in Backend/migrations to the configured PostgreSQL database.');
    }
}
export async function closePostgresPool() {
    if (pool) {
        await pool.end();
        pool = undefined;
    }
}
