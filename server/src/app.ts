import express from 'express';
import cors from 'cors';
import './db/index.js';
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
