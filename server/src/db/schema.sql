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
