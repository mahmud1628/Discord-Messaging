const express = require("express");
const {
  listMessages,
  addReaction,
  removeReaction
} = require("../controllers/message.controller");

const { authenticateAccessToken } = require("../middlewares/authenticate");

const router = express.Router({ mergeParams: true });

router.get("/", listMessages);

// ADD REACTION
router.put(
  "/:messageId/reactions/:emoji",
  authenticateAccessToken,
  addReaction
);

// REMOVE REACTION
router.delete(
  "/:messageId/reactions/:emoji",
  authenticateAccessToken,
  removeReaction
);

module.exports = router;