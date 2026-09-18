import pg from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Run `vercel env pull .env.local` in server/ (a real Neon Postgres database was ' +
      'provisioned via the Vercel Marketplace — see MEMORY.md) or set it manually for another Postgres instance.',
  );
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

/** Thin async wrapper matching the shape the route/service code uses,
 * translating SQLite-style `?` positional placeholders to Postgres `$1..$n`
 * so the rest of the codebase didn't need a full query-string rewrite. */
function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export const db = {
  async get<T = any>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const res = await pool.query(toPgPlaceholders(sql), params);
    return res.rows[0] as T | undefined;
  },
  async all<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await pool.query(toPgPlaceholders(sql), params);
    return res.rows as T[];
  },
  async run(sql: string, params: unknown[] = []): Promise<{ rowCount: number }> {
    const res = await pool.query(toPgPlaceholders(sql), params);
    return { rowCount: res.rowCount ?? 0 };
  },
};

let migrated: Promise<void> | null = null;

export function ensureMigrated(): Promise<void> {
  if (!migrated) {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    migrated = pool.query(schema).then(() => undefined);
  }
  return migrated;
}
