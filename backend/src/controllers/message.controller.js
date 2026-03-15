const messageService = require("../services/message.service");

exports.listMessages = async (req, res) => {
  const { serverId, channelId } = req.params;
  const { limit = 50, before, after } = req.query;

  try {
    const result = await messageService.listMessages({
      serverId,
      channelId,
      before,
      after,
      limit,
    });

    res.json({
      messages: result.rows,
      count: result.rows.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};