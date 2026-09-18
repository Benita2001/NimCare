import './loadEnv.js';
import { app } from './app.js';

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 8787);

app.listen(port, () => {
  console.log(`NimCare API listening on :${port}`);
  if (!process.env.NIMIQ_RPC_URL) {
    console.warn('NIMIQ_RPC_URL not set — transaction verification will report RPC_UNAVAILABLE (see MEMORY.md).');
  }
  if (isProduction && !process.env.ALLOWED_ORIGINS) {
    console.warn('NODE_ENV=production but ALLOWED_ORIGINS is unset — no cross-origin requests will be allowed.');
  }
  if (isProduction && !process.env.APP_ORIGIN) {
    console.warn('NODE_ENV=production but APP_ORIGIN is unset — auth challenges will use the dev-labeled origin.');
  }
});
