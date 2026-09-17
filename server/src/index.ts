import express from 'express';
import cors from 'cors';
import './db/index.js';
import { authRouter } from './routes/auth.js';
import { pairsRouter } from './routes/pairs.js';
import { caredropsRouter } from './routes/caredrops.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rpcConfigured: Boolean(process.env.NIMIQ_RPC_URL) });
});

app.use('/api/auth', authRouter);
app.use('/api/pairs', pairsRouter);
app.use('/api/caredrops', caredropsRouter);

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`NimCare API listening on :${port}`);
  if (!process.env.NIMIQ_RPC_URL) {
    console.warn('NIMIQ_RPC_URL not set — transaction verification will report RPC_UNAVAILABLE (see MEMORY.md).');
  }
});
