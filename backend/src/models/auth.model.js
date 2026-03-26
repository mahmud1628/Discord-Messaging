const pool = require('../db');

exports.findUserByEmail = async (email) => {
  return pool.query(
    `SELECT id, email FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
};

exports.findUserByUsername = async (username) => {
  return pool.query(
    `SELECT id, username FROM users WHERE username = $1 LIMIT 1`,
    [username]
  );
};

exports.findUserForLogin = async (identifier) => {
  return pool.query(
    `
      SELECT id, email, username, password_hash, display_name, date_of_birth, created_at
      FROM users
      WHERE email = $1 OR username = $1
      LIMIT 1
    `,
    [identifier]
  );
};

exports.revokeAccessToken = async ({ tokenId, userId, expiresAtEpochSeconds }) => {
  return pool.query(
    `
      INSERT INTO revoked_access_tokens (jti, user_id, expires_at)
      VALUES ($1, $2, to_timestamp($3))
      ON CONFLICT (jti) DO NOTHING
      RETURNING jti
    `,
    [tokenId, userId, expiresAtEpochSeconds]
  );
};

exports.isAccessTokenRevoked = async (tokenId) => {
  return pool.query(
    `
      SELECT 1
      FROM revoked_access_tokens
      WHERE jti = $1
      LIMIT 1
    `,
    [tokenId]
  );
};

exports.createUser = async ({ email, username, passwordHash, displayName, dateOfBirth }) => {
  return pool.query(
    `
      INSERT INTO users (email, username, password_hash, display_name, date_of_birth)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, display_name, date_of_birth, created_at
    `,
    [email, username, passwordHash, displayName, dateOfBirth]
  );
};
