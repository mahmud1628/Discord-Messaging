const pool = require("../db");

exports.listMessages = async ({ serverId, channelId, before, after, limit }) => {
  let query = `
    SELECT *
    FROM messages
    WHERE channel_id = $1
  `;

  const values = [channelId];
  let paramIndex = 2;

  if (before) {
    query += ` AND id < $${paramIndex}`;
    values.push(before);
    paramIndex++;
  }

  if (after) {
    query += ` AND id > $${paramIndex}`;
    values.push(after);
    paramIndex++;
  }

  query += `
    ORDER BY created_at DESC
    LIMIT $${paramIndex}
  `;

  values.push(parseInt(limit));

  return pool.query(query, values);
};

//  ADD REACTION
exports.addReaction = async ({ messageId, userId, emoji }) => {
  const query = `
    INSERT INTO message_reactions (message_id, user_id, emoji)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `;

  return pool.query(query, [messageId, userId, emoji]);
};

// REMOVE REACTION
exports.removeReaction = async ({ messageId, userId, emoji }) => {
  const query = `
    DELETE FROM message_reactions
    WHERE message_id = $1 AND user_id = $2 AND emoji = $3
  `;

  return pool.query(query, [messageId, userId, emoji]);
};