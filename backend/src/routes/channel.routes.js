const express = require("express");
const messageRoutes = require("./message.routes");

const router = express.Router({ mergeParams: true });

router.use("/:channelId/messages", messageRoutes);

module.exports = router;