CREATE TABLE IF NOT EXISTS wallet (
  address TEXT PRIMARY KEY,
  public_key TEXT,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_nonce (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

-- Only a SHA-256 hash of each opaque session token is stored (see auth.ts) —
-- the plaintext token is never persisted, so a DB read cannot impersonate a session.
CREATE TABLE IF NOT EXISTS session (
  token_hash TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pair (
  id TEXT PRIMARY KEY,
  member_a_wallet TEXT NOT NULL REFERENCES wallet(address),
  member_b_wallet TEXT REFERENCES wallet(address),
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('PARTNER','FRIEND','FAMILY')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','ACCEPTED')),
  created_at TEXT NOT NULL,
  paired_at TEXT
);

CREATE TABLE IF NOT EXISTS pair_invite (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pair(id),
  token_hash TEXT NOT NULL,
  created_by_wallet TEXT NOT NULL REFERENCES wallet(address),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','CONSUMED','EXPIRED'))
);

CREATE TABLE IF NOT EXISTS caredrop (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pair(id),
  sender_wallet TEXT NOT NULL REFERENCES wallet(address),
  recipient_wallet TEXT NOT NULL REFERENCES wallet(address),
  prompt_id TEXT,
  prompt_text TEXT NOT NULL,
  amount_luna INTEGER NOT NULL CHECK (amount_luna > 0),
  sealed_note TEXT NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN
    ('DRAFT','AWAITING_PAYMENT','PAYMENT_SUBMITTED','PAYMENT_VERIFIED','DELIVERED','COMPLETED','FAILED')),
  failure_reason TEXT,
  transaction_hash TEXT UNIQUE,
  blockchain_verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (blockchain_verification_status IN ('UNVERIFIED','PENDING','VERIFIED','MISMATCH','RPC_UNAVAILABLE')),
  created_at TEXT NOT NULL,
  funded_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS caredrop_response (
  id TEXT PRIMARY KEY,
  caredrop_id TEXT NOT NULL REFERENCES caredrop(id),
  author_wallet TEXT NOT NULL REFERENCES wallet(address),
  response_text TEXT NOT NULL,
  completion_signature TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_caredrop_pair ON caredrop(pair_id);
CREATE INDEX IF NOT EXISTS idx_pair_member_a ON pair(member_a_wallet);
CREATE INDEX IF NOT EXISTS idx_pair_member_b ON pair(member_b_wallet);

-- 2026-09-18 pivot: surprise-first media CareDrops. Loops now form
-- automatically the first time two wallets exchange a CareDrop, so a
-- relationship type is no longer required up front.
ALTER TABLE pair ALTER COLUMN relationship_type DROP NOT NULL;

-- CareDrops no longer require prompt_text/sealed_note (replaced by
-- title/caption below); kept nullable for backward compatibility with rows
-- created before this pivot rather than dropped, to avoid a destructive
-- migration on the live production database.
ALTER TABLE caredrop ALTER COLUMN prompt_text DROP NOT NULL;
ALTER TABLE caredrop ALTER COLUMN sealed_note DROP NOT NULL;

ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'TREAT'
  CHECK (type IN ('PHOTO', 'PLAYLIST', 'MOVIE', 'TREAT'));
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS media_mime TEXT;
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS external_provider TEXT;
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS external_title TEXT;
-- CASHLINK is modeled but unimplemented — see MEMORY.md for why the
-- Cashlink spike failed (no createCashlink on the Mini App provider, and
-- the Hub API's redirect-based flow is incompatible with a Mini App
-- WebView). DIRECT_NIM is the only funding path this build actually uses.
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS funding_type TEXT NOT NULL DEFAULT 'DIRECT_NIM'
  CHECK (funding_type IN ('DIRECT_NIM', 'CASHLINK'));
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS share_token_hash TEXT;
ALTER TABLE caredrop ADD COLUMN IF NOT EXISTS opened_at TEXT;

CREATE INDEX IF NOT EXISTS idx_caredrop_share_token ON caredrop(share_token_hash);
