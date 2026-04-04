const messageService = require("../services/message.service");
const { getIO } = require("../socket/io");

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

    const createdMessage = file ? result.message : result.rows?.[0];

    if (createdMessage) {
      try {
        const io = getIO();
        if (io) {
          io.to(`channel:${channelId}`).emit("message:new", {
            id: createdMessage.id,
            channelId: createdMessage.channel_id,
            content: createdMessage.content,
            createdAt: createdMessage.created_at,
            author: {
              id: userId,
              username: req.auth.username,
            },
            attachments: file
              ? [
                  {
                    id: result.attachment_id,
                    file_url: result.file_url,
                    file_name: result.file_name,
                    file_size: result.file_size,
                    mime_type: result.mime_type,
                  },
                ]
              : [],
          });
        }
      } catch (socketError) {
        console.error("[WS] message:new emit error", socketError);
      }
    }

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
  const { channelId } = req.params;
  const { messageId, emoji } = req.params;
  const userId = req.auth.userId;
  const username = req.auth.username;

  try {
    const result = await messageService.addReaction({
      channelId,
      messageId,
      userId,
      emoji,
    });

    if (result.rowCount > 0) {
      try {
        const io = getIO();
        if (io) {
          io.to(`channel:${channelId}`).emit("message:reaction:add", {
            messageId,
            emoji,
            user: {
              id: userId,
              username,
            },
          });
        }
      } catch (socketError) {
        console.error("[WS] message:reaction:add emit error", socketError);
      }
    }

    res.json({
      success: true,
      message: result.rowCount > 0 ? "Reaction added" : "Reaction already exists",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// REMOVE REACTION
exports.removeReaction = async (req, res) => {
  const { channelId } = req.params;
  const { messageId, emoji } = req.params;
  const userId = req.auth.userId;
  const username = req.auth.username;

  try {
    const result = await messageService.removeReaction({
      channelId,
      messageId,
      userId,
      emoji,
    });

    if (result.rowCount > 0) {
      try {
        const io = getIO();
        if (io) {
          io.to(`channel:${channelId}`).emit("message:reaction:remove", {
            messageId,
            emoji,
            user: {
              id: userId,
              username,
            },
          });
        }
      } catch (socketError) {
        console.error("[WS] message:reaction:remove emit error", socketError);
      }
    }

    res.json({
      success: true,
      message: result.rowCount > 0 ? "Reaction removed" : "Reaction not found",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// PIN MESSAGE
exports.pinMessage = async (req, res) => {
  const { channelId, messageId } = req.params;
  const pinnedBy = req.auth.userId;
  const pinnedByUsername = req.auth.username;

  try {
    const result = await messageService.pinMessage({
      messageId,
      channelId,
      pinnedBy,
    });

    if (result.rowCount === 0) {
      return res.status(409).json({ error: "Message is already pinned" });
    }

    try {
      const io = getIO();
      if (io) {
        io.to(`channel:${channelId}`).emit("message:pinned", {
          messageId,
          channelId,
          pinned: true,
          pinnedAt: result.rows[0].pinned_at,
          pinnedBy,
          pinnedByUsername,
        });
      }
    } catch (socketError) {
      console.error("[WS] message:pinned emit error", socketError);
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
  const unpinnedBy = req.auth.userId;

  try {
    const result = await messageService.unpinMessage({ messageId, channelId });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pinned message not found" });
    }

    try {
      const io = getIO();
      if (io) {
        io.to(`channel:${channelId}`).emit("message:unpinned", {
          messageId,
          channelId,
          pinned: false,
          unpinnedBy,
        });
      }
    } catch (socketError) {
      console.error("[WS] message:unpinned emit error", socketError);
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
  const userId = req.auth.userId;
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

    try {
      const io = getIO();
      if (io) {
        io.to(`channel:${channelId}`).emit("message:updated", {
          messageId: result.message.id,
          channelId: result.message.channel_id,
          content: result.message.content,
          editedAt: result.message.edited_at,
          deletedAttachmentIds: result.deletedAttachmentIds || [],
        });
        console.debug("[WS] message:updated emitted for messageId:", messageId);
      }
    } catch (socketError) {
      console.error("[WS] message:updated emit error", socketError);
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

    try {
      const io = getIO();
      if (io) {
        io.to(`channel:${channelId}`).emit("message:deleted", {
          messageId,
          channelId,
          deletedBy: userId,
        });
      }
    } catch (socketError) {
      console.error("[WS] message:deleted emit error", socketError);
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
