const messageService = require("../services/message.service");

exports.sendMessage = async (req, res) => {
  const { serverId, channelId } = req.params;
  const userId = req.auth.userId;
  const { content } = req.body || {};
  const file =
    req.file ||
    req.files?.file?.[0] ||
    req.files?.attachments?.[0] ||
    null;
  const isMultipart = req.is("multipart/form-data");
  const debugFiles = req.files
    ? Array.isArray(req.files)
      ? req.files.map((uploadedFile) => ({
          fieldname: uploadedFile.fieldname,
          originalname: uploadedFile.originalname,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
        }))
      : Object.entries(req.files).flatMap(([fieldName, uploadedFiles]) =>
          uploadedFiles.map((uploadedFile) => ({
            fieldname: fieldName,
            originalname: uploadedFile.originalname,
            mimetype: uploadedFile.mimetype,
            size: uploadedFile.size,
          }))
        )
    : [];

  if (process.env.NODE_ENV !== "production") {
    console.debug("[sendMessage] req.body:", req.body || {});
    console.debug("[sendMessage] req.files:", debugFiles);
  }

  if (!content || !String(content).trim()) {
    return res.status(400).json({
      error: "Validation error",
      details: ["content is required"],
    });
  }

  if (isMultipart && !file) {
    return res.status(400).json({
      error: "Validation error",
      details: ["file is required"],
    });
  }

  try {
    const result = file
      ? await messageService.sendMessageWithAttachment({
          serverId,
          channelId,
          authorId: userId,
          content: String(content).trim(),
          file,
        })
      : await messageService.sendMessage({
          serverId,
          channelId,
          authorId: userId,
          content: String(content).trim(),
        });

    return res.status(201).json(
      file
        ? result
        : {
            message: result.rows[0],
          }
    );
  } catch (err) {
    console.error(err);

    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message || "Database error" });
  }
};

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
      count: result.rows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

//  ADD REACTION
exports.addReaction = async (req, res) => {
  const { messageId, emoji } = req.params;
  const userId = req.auth.userId;

  try {
    await messageService.addReaction({ messageId, userId, emoji });

    res.json({
      success: true,
      message: "Reaction added",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// REMOVE REACTION
exports.removeReaction = async (req, res) => {
  const { messageId, emoji } = req.params;
  const userId = req.auth.userId;

  try {
    await messageService.removeReaction({ messageId, userId, emoji });

    res.json({
      success: true,
      message: "Reaction removed",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// PIN MESSAGE
exports.pinMessage = async (req, res) => {
  const { channelId, messageId } = req.params;
  const userId = req.auth.userId;
  const pinnedBy = req.auth.userId;

  try {
    const result = await messageService.pinMessage({
      messageId,
      channelId,
      pinnedBy,
    });

    if (result.rowCount === 0) {
      return res.status(409).json({ error: "Message is already pinned" });
    }

    res.status(201).json({
      success: true,
      message: "Message pinned",
      pinned: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// UNPIN MESSAGE
exports.unpinMessage = async (req, res) => {
  const { channelId, messageId } = req.params;

  try {
    const result = await messageService.unpinMessage({ messageId, channelId });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pinned message not found" });
    }

    res.json({
      success: true,
      message: "Message unpinned",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// GET PINNED MESSAGES
exports.getPinnedMessages = async (req, res) => {
  const { channelId } = req.params;

  try {
    const result = await messageService.getPinnedMessages({ channelId });

    res.json({
      pinnedMessages: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// UPDATE MESSAGE
exports.updateMessage = async (req, res) => {
  const { channelId, messageId } = req.params;
  const hasContent = Object.prototype.hasOwnProperty.call(req.body, "content");
  const { content, deleteAttachmentIds } = req.body;

  const hasDeleteAttachmentIds = Array.isArray(deleteAttachmentIds);

  if (!hasContent && !hasDeleteAttachmentIds) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  if (hasContent && typeof content !== "string") {
    return res.status(400).json({ error: "content must be a string" });
  }

  if (deleteAttachmentIds && !Array.isArray(deleteAttachmentIds)) {
    return res
      .status(400)
      .json({ error: "deleteAttachmentIds must be an array" });
  }

  if (hasContent && hasDeleteAttachmentIds) {
    return res
      .status(400)
      .json({ error: "Update content or delete attachments, not both" });
  }

  if (hasDeleteAttachmentIds && deleteAttachmentIds.length === 0) {
    return res
      .status(400)
      .json({ error: "deleteAttachmentIds cannot be empty" });
  }

  try {
    const result = await messageService.updateMessage({
      channelId,
      messageId,
      userId,
      content,
      deleteAttachmentIds,
      hasContent,
    });

    if (!result) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (result.forbidden) {
      return res.status(403).json({ error: "Not allowed to edit this message" });
    }

    return res.json({
      message: result.message,
      deletedAttachmentIds: result.deletedAttachmentIds,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.deleteMessage = async (req, res) => {
  const { channelId, messageId } = req.params;
  const userId = req.auth.userId;

  try {
    const result = await messageService.deleteMessage({
      channelId,
      messageId,
      userId,
    });

    if (!result) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (result.forbidden) {
      return res.status(403).json({ error: "Not allowed to delete this message" });
    }

    return res.json({
      deleted: true,
      message: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.getAttachmentDownloadUrl = async (req, res) => {
  const { serverId, channelId, attachmentId } = req.params;
  const userId = req.auth.userId;

  try {
    const result = await messageService.getAttachmentDownloadUrlForAuthenticatedUser({
      serverId,
      channelId,
      attachmentId,
      userId,
    });

    return res.json({
      downloadUrl: result.signedUrl,
    });
  } catch (err) {
    console.error(err);

    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    return res.status(500).json({ error: "Failed to get attachment download URL" });
  }
};
