import express from 'express';
import cors from 'cors';
import { ensureMigrated } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { pairsRouter } from './routes/pairs.js';
import { caredropsRouter } from './routes/caredrops.js';

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
  res.json({
    ok: true,
    rpcConfigured: Boolean(process.env.NIMIQ_RPC_URL),
    environment: process.env.NODE_ENV ?? 'development',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/pairs', pairsRouter);
app.use('/api/caredrops', caredropsRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
});
