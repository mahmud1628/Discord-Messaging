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
