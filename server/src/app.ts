import express from 'express';
import cors from 'cors';
import { ensureMigrated } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { pairsRouter } from './routes/pairs.js';
import { caredropsRouter } from './routes/caredrops.js';
import { mediaRouter } from './routes/media.js';

const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const devOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/;

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // same-origin / server-to-server / curl / test client
      if (configuredOrigins.includes(origin)) return callback(null, true);
      if (!isProduction && devOriginPattern.test(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
  }),
);
app.use(express.json());

// Ensures the Postgres schema exists before any request is handled. On
// Vercel Functions this runs once per cold start of a given instance;
// CREATE TABLE IF NOT EXISTS makes repeated calls harmless.
app.use((_req, res, next) => {
  ensureMigrated().then(() => next()).catch(next);
});

app.get('/api/health', (_req, res) => {
  const rawNetworkId = process.env.NIMIQ_NETWORK_ID;
  const networkId = rawNetworkId ? Number(rawNetworkId) : null;
  res.json({
    ok: true,
    rpcConfigured: Boolean(process.env.NIMIQ_RPC_URL),
    // Non-secret: which network on-chain verification expects, so a device
    // tester can confirm Nimiq Pay's active network matches the backend
    // before assuming a payment will verify. See MEMORY.md 2026-09-18
    // transaction internal_error hotfix.
    networkConfigured: Number.isFinite(networkId),
    networkId: Number.isFinite(networkId) ? networkId : null,
    environment: process.env.NODE_ENV ?? 'development',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/pairs', pairsRouter);
app.use('/api/caredrops', caredropsRouter);
app.use('/api/media', mediaRouter);

/**
 * Logs safe, structured diagnostic fields — never the full raw error
 * object (which, for a Postgres error, includes `detail`, potentially
 * containing user data like a wallet address), never request bodies,
 * session tokens, or signatures. The client always gets the same generic
 * `internal_error` regardless — this only makes server-side debugging
 * possible without over-logging. See MEMORY.md 2026-09-18 backend
 * root-cause fix.
 */
function isPostgresError(err: unknown): err is { code: string; constraint?: string; table?: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { code?: unknown }).code === 'string' &&
    /^[0-9A-Z]{5}$/.test((err as { code: string }).code)
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: any, res: any, _next: any) => {
  if (isPostgresError(err)) {
    console.error('[DB ERROR]', {
      code: err.code,
      constraint: err.constraint ?? null,
      table: err.table ?? null,
      route: req.originalUrl,
      method: req.method,
    });
  } else {
    console.error('[ERROR]', {
      name: err instanceof Error ? err.name : 'UnknownError',
      message: err instanceof Error ? err.message : String(err),
      route: req.originalUrl,
      method: req.method,
    });
  }
  if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
});
