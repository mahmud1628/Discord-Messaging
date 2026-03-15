const express = require("express");
const channelRoutes = require("./channel.routes");

const router = express.Router();

router.use("/:serverId/channels", channelRoutes);

module.exports = router;