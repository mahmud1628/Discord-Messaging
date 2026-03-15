const express = require("express");
const { listMessages } = require("../controllers/message.controller");

const router = express.Router();

router.get(
  "/:serverId/channels/:channelId/messages",
  listMessages
);

module.exports = router;