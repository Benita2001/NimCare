import { config } from 'dotenv';
import { existsSync } from 'node:fs';

// Prefer .env.local (what `vercel env pull` writes) so `vercel integration
// add` output works out of the box; fall back to a plain .env for anyone
// not using the Vercel CLI locally. Neither is ever committed (see .gitignore).
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
} else {
  config();
}
