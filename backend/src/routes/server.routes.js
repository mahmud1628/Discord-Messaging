const express = require("express");
const channelRoutes = require("./channel.routes");
const { listServers, listServerMembers } = require("../controllers/server.controller");

const router = express.Router();

router.get("/", listServers);
router.get("/:serverId/members", listServerMembers);

router.use("/:serverId/channels", channelRoutes);

module.exports = router;