const pool = require("../db");

exports.listServers = async () => {
  return pool.query(
    `
      SELECT id, name, owner_id, created_at
      FROM servers
      ORDER BY created_at DESC
    `
  );
};

exports.listServerMembers = async (serverId) => {
  return pool.query(
    `
      SELECT DISTINCT id, username, display_name
      FROM (
        SELECT
          owner.id,
          owner.username,
          owner.display_name
        FROM servers s
        JOIN users owner ON owner.id = s.owner_id
        WHERE s.id = $1

        UNION

        SELECT
          author.id,
          author.username,
          author.display_name
        FROM channels c
        JOIN messages m ON m.channel_id = c.id
        JOIN users author ON author.id = m.author_id
        WHERE c.server_id = $1
      ) members
      ORDER BY username ASC
    `,
    [serverId]
  );
};
