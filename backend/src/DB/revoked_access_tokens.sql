CREATE TABLE IF NOT EXISTS revoked_access_tokens (
  jti uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_user_id
  ON revoked_access_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_expires_at
  ON revoked_access_tokens(expires_at);

-- Optional cleanup query (run periodically):
-- DELETE FROM revoked_access_tokens WHERE expires_at < now();
