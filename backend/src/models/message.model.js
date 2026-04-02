const pool = require("../db");

exports.findChannelInServer = async ({ serverId, channelId }) => {
  return pool.query(
    `
      SELECT id
      FROM channels
      WHERE id = $1 AND server_id = $2
      LIMIT 1
    `,
    [channelId, serverId]
  );
};

exports.findUserById = async (userId) => {
  return pool.query(
    `
      SELECT id
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );
};

const runQuery = async (client, query, values) => client.query(query, values);

exports.createMessage = async ({ id, channelId, authorId, content, client = pool }) => {
  const values = id ? [id, channelId, authorId, content] : [channelId, authorId, content];

  const query = id
    ? `
      INSERT INTO messages (id, channel_id, author_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, channel_id, author_id, content, created_at, edited_at
    `
    : `
      INSERT INTO messages (channel_id, author_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, channel_id, author_id, content, created_at, edited_at
    `;

  return runQuery(client, query, values);
};

exports.insertMessageAttachment = async (
  { messageId, fileUrl, fileName, fileSize, mimeType },
  client = pool
) => {
  return runQuery(
    client,
    `
      INSERT INTO message_attachments (message_id, file_url, file_name, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, message_id, file_url, file_name, file_size, mime_type, created_at
    `,
    [messageId, fileUrl, fileName, fileSize, mimeType]
  );
};

exports.deleteMessageById = async (messageId, client = pool) => {
  return runQuery(
    client,
    `
      DELETE FROM messages
      WHERE id = $1
      RETURNING id
    `,
    [messageId]
  );
};

exports.listMessages = async ({ channelId, before, after, limit = 50 }) => {
  let values = [channelId];
  let conditions = [`m.channel_id = $1`];
  let paramIndex = 2;

  if (after) {
    conditions.push(`
      m.created_at > (
        SELECT created_at FROM messages WHERE id = $${paramIndex}
      )
    `);
    values.push(after);
    paramIndex++;
  }

  if (before) {
    conditions.push(`
      m.created_at < (
        SELECT created_at FROM messages WHERE id = $${paramIndex}
      )
    `);
    values.push(before);
    paramIndex++;
  }

  const query = `
SELECT 
  m.id,
  m.channel_id,
  m.author_id,
  m.content,
  m.created_at,
  m.edited_at,

  jsonb_build_object(
    'id', au.id,
    'username', au.username,
    'display_name', au.display_name
  ) AS author,

  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', a.id,
      'file_url', a.file_url,
      'file_name', a.file_name
    )) FILTER (WHERE a.id IS NOT NULL),
    '[]'
  ) AS attachments,

  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', r.id,
      'emoji', r.emoji,
      'user_id', r.user_id,
      'user', jsonb_build_object(
        'id', ru.id,
        'username', ru.username,
        'display_name', ru.display_name
      )
    )) FILTER (WHERE r.id IS NOT NULL),
    '[]'
  ) AS reactions

FROM messages m

LEFT JOIN message_attachments a 
  ON m.id = a.message_id

LEFT JOIN message_reactions r 
  ON m.id = r.message_id

LEFT JOIN users ru 
  ON r.user_id = ru.id

LEFT JOIN users au
  ON m.author_id = au.id

WHERE ${conditions.join(" AND ")}

GROUP BY m.id, au.id
ORDER BY m.created_at ASC
LIMIT $${paramIndex};
`;

  values.push(limit);

  // print author id)

  console.log("QUERY:", query);
  console.log("VALUES:", values);

  return pool.query(query, values);
};

exports.updateMessage = async ({ channelId, messageId, userId, content, deleteAttachmentIds = [], hasContent }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
        SELECT id, author_id
        FROM messages
        WHERE id = $1 AND channel_id = $2
        LIMIT 1
      `,
      [messageId, channelId]
    );

    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    if (existing.rows[0].author_id !== userId) {
      await client.query("ROLLBACK");
      return { forbidden: true };
    }

    let messageResult;

    if (hasContent) {
      messageResult = await client.query(
        `
          UPDATE messages
          SET content = $3,
              edited_at = now()
          WHERE id = $1 AND channel_id = $2
          RETURNING id, channel_id, author_id, content, created_at, edited_at
        `,
        [messageId, channelId, content]
      );
    } else {
      messageResult = await client.query(
        `
          SELECT id, channel_id, author_id, content, created_at, edited_at
          FROM messages
          WHERE id = $1 AND channel_id = $2
        `,
        [messageId, channelId]
      );
    }

    let deletedAttachmentIds = [];
    if (Array.isArray(deleteAttachmentIds) && deleteAttachmentIds.length > 0) {
      const deleteResult = await client.query(
        `
          DELETE FROM message_attachments
          WHERE message_id = $1 AND id = ANY($2::uuid[])
          RETURNING id
        `,
        [messageId, deleteAttachmentIds]
      );

      deletedAttachmentIds = deleteResult.rows.map((row) => row.id);
    }

    await client.query("COMMIT");

    return {
      message: messageResult.rows[0],
      deletedAttachmentIds,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

exports.deleteMessage = async ({ channelId, messageId, userId }) => {
  const existing = await pool.query(
    `
      SELECT id, author_id, channel_id, content, created_at, edited_at
      FROM messages
      WHERE id = $1 AND channel_id = $2
      LIMIT 1
    `,
    [messageId, channelId]
  );

  if (existing.rowCount === 0) {
    return null;
  }

  if (existing.rows[0].author_id !== userId) {
    return { forbidden: true };
  }

  const result = await pool.query(
    `
      DELETE FROM messages
      WHERE id = $1 AND channel_id = $2
      RETURNING id, channel_id, author_id, content, created_at, edited_at
    `,
    [messageId, channelId]
  );

  return result.rows[0];
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

// PIN MESSAGE
exports.pinMessage = async ({ messageId, channelId, pinnedBy }) => {
  const query = `
    INSERT INTO pinned_messages (message_id, channel_id, pinned_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (message_id) DO NOTHING
    RETURNING *
  `;

  return pool.query(query, [messageId, channelId, pinnedBy]);
};

// UNPIN MESSAGE
exports.unpinMessage = async ({ messageId, channelId }) => {
  const query = `
    DELETE FROM pinned_messages
    WHERE message_id = $1 AND channel_id = $2
    RETURNING *
  `;

  return pool.query(query, [messageId, channelId]);
};

// GET PINNED MESSAGES
exports.getPinnedMessages = async ({ channelId }) => {
  const query = `
    SELECT
      m.id,
      m.content,
      m.created_at,
      pm.pinned_at,
      pm.pinned_by,
      u.username AS pinned_by_username
    FROM pinned_messages pm
    JOIN messages m ON pm.message_id = m.id
    LEFT JOIN users u ON pm.pinned_by = u.id
    WHERE pm.channel_id = $1
    ORDER BY pm.pinned_at DESC
  `;

  return pool.query(query, [channelId]);
};