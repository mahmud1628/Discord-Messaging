const express = require("express");
const {
  sendMessage,
  listMessages,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  getAttachmentDownloadUrl,
} = require("../controllers/message.controller");
const { uploadMessageAttachments } = require("../middlewares/messageUpload");

const {
  updateMessage,
  deleteMessage,
} = require("../controllers/message.controller");

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  uploadMessageAttachments.fields([
    { name: "file", maxCount: 1 },
    { name: "attachments", maxCount: 10 },
  ]),
  sendMessage
);

router.get("/", listMessages);

// PINNED MESSAGES
router.get("/pinned", getPinnedMessages);

// PIN MESSAGE
router.put("/:messageId/pin", pinMessage);

// UNPIN MESSAGE
router.delete("/:messageId/pin", unpinMessage);

// ADD REACTION
router.put("/:messageId/reactions/:emoji", addReaction);

// REMOVE REACTION
router.delete("/:messageId/reactions/:emoji", removeReaction);
router.get("/attachments/:attachmentId/download-url", getAttachmentDownloadUrl);
router.put("/:messageId", updateMessage);
router.delete("/:messageId", deleteMessage);

module.exports = router;
