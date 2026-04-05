const serverService = require("../services/server.service");

exports.listServers = async (_req, res) => {
  try {
    const result = await serverService.listServers();

    return res.json({
      servers: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.listServerMembers = async (req, res) => {
  try {
    const { serverId } = req.params;
    const result = await serverService.listServerMembers(serverId);

    return res.json({
      members: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Database error" });
  }
};
