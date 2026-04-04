const crypto = require("crypto");
const pool = require("../db");
const messageModel = require("../models/message.model");
const env = require("../config/env");
const { getSupabaseClient, ensureStorageBucket } = require("../config/supabase");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sanitizeFileName = (originalname) => originalname.replace(/[^a-zA-Z0-9._-]/g, "_");

const buildAttachmentPath = ({ messageId, originalname }) => {
  const timestamp = Date.now();
  return `messages/${messageId}/${timestamp}-${sanitizeFileName(originalname)}`;
};

const extractStoragePathFromPublicUrl = (fileUrl) => {
  try {
    const parsedUrl = new URL(fileUrl);
    const publicPrefix = `/storage/v1/object/public/${env.supabaseStorageBucket}/`;
    const pathName = parsedUrl.pathname || "";

    if (!pathName.startsWith(publicPrefix)) {
      return null;
    }

    return decodeURIComponent(pathName.slice(publicPrefix.length));
  } catch {
    return null;
  }
};

const deleteUploadedFile = async (filePath) => {
  try {
    const supabase = getSupabaseClient();
    await supabase.storage.from(env.supabaseStorageBucket).remove([filePath]);
  } catch (error) {
    console.error("Failed to clean up uploaded file:", error);
  }
};

exports.sendMessage = async ({ serverId, channelId, authorId, content }) => {
  const channelResult = await messageModel.findChannelInServer({ serverId, channelId });
  if (channelResult.rowCount === 0) {
    throw createHttpError(404, "Channel not found in server");
  }

  const authorResult = await messageModel.findUserById(authorId);
  if (authorResult.rowCount === 0) {
    throw createHttpError(404, "Author not found");
  }

  return messageModel.createMessage({
    channelId,
    authorId,
    content,
  });
};

exports.sendMessageWithAttachment = async ({ serverId, channelId, authorId, content, file }) => {
  const trimmedContent = String(content || "").trim();

  if (!trimmedContent) {
    throw createHttpError(400, "content is required");
  }

  if (!file) {
    throw createHttpError(400, "file is required");
  }

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey || !env.supabaseStorageBucket) {
    throw createHttpError(
      500,
      "Supabase configuration is missing. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
    );
  }

  const channelResult = await messageModel.findChannelInServer({ serverId, channelId });
  if (channelResult.rowCount === 0) {
    throw createHttpError(404, "Channel not found in server");
  }

  const authorResult = await messageModel.findUserById(authorId);
  if (authorResult.rowCount === 0) {
    throw createHttpError(404, "Author not found");
  }

  const supabase = await ensureStorageBucket(env.supabaseStorageBucket);
  const messageId = crypto.randomUUID();
  const filePath = buildAttachmentPath({ messageId, originalname: file.originalname });

  const uploadResult = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadResult.error) {
    throw createHttpError(500, uploadResult.error.message);
  }

  const { data: publicData } = supabase.storage.from(env.supabaseStorageBucket).getPublicUrl(filePath);
  const fileUrl = publicData?.publicUrl;

  if (!fileUrl) {
    await deleteUploadedFile(filePath);
    throw createHttpError(500, "Failed to generate public URL for uploaded file");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const messageResult = await messageModel.createMessage({
      id: messageId,
      channelId,
      authorId,
      content: trimmedContent,
      client,
    });

    const attachmentResult = await messageModel.insertMessageAttachment(
      {
        messageId,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      client
    );

    await client.query("COMMIT");

    return {
      message: messageResult.rows[0],
      file_url: attachmentResult.rows[0].file_url,
      file_name: attachmentResult.rows[0].file_name,
      file_size: attachmentResult.rows[0].file_size,
      mime_type: attachmentResult.rows[0].mime_type,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    await deleteUploadedFile(filePath);
    throw error;
  } finally {
    client.release();
  }
};

exports.getAttachmentDownloadUrlForAuthenticatedUser = async ({
  serverId,
  channelId,
  attachmentId,
  userId,
}) => {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey || !env.supabaseStorageBucket) {
    throw createHttpError(
      500,
      "Supabase configuration is missing. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
    );
  }

  const attachmentResult = await messageModel.findAttachmentForAuthenticatedUser({
    serverId,
    channelId,
    attachmentId,
    userId,
  });

  if (attachmentResult.rowCount === 0) {
    throw createHttpError(404, "Attachment not found for this user");
  }

  const attachment = attachmentResult.rows[0];
  const storagePath = extractStoragePathFromPublicUrl(attachment.file_url);

  if (!storagePath) {
    throw createHttpError(500, "Invalid attachment storage path");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .createSignedUrl(storagePath, 60, {
      download: attachment.file_name || undefined,
    });

  if (error || !data?.signedUrl) {
    throw createHttpError(500, error?.message || "Failed to generate attachment download URL");
  }

  return {
    signedUrl: data.signedUrl,
  };
};

exports.listMessages = async ({ serverId, channelId, before, after, limit }) => {
  return messageModel.listMessages({
    serverId,
    channelId,
    before,
    after,
    limit,
  });
};

exports.updateMessage = async ({ channelId, messageId, userId, content, deleteAttachmentIds, hasContent }) => {
  return messageModel.updateMessage({
    channelId,
    messageId,
    userId,
    content,
    deleteAttachmentIds,
    hasContent,
  });
};

exports.deleteMessage = async ({ channelId, messageId, userId }) => {
  return messageModel.deleteMessage({
    channelId,
    messageId,
    userId,
  });
};

// ADD REACTION
exports.addReaction = async ({ messageId, userId, emoji }) => {
  return messageModel.addReaction({ messageId, userId, emoji });
};

// REMOVE REACTION
exports.removeReaction = async ({ messageId, userId, emoji }) => {
  return messageModel.removeReaction({ messageId, userId, emoji });
};

// PIN MESSAGE
exports.pinMessage = async ({ messageId, channelId, pinnedBy }) => {
  return messageModel.pinMessage({ messageId, channelId, pinnedBy });
};

// UNPIN MESSAGE
exports.unpinMessage = async ({ messageId, channelId }) => {
  return messageModel.unpinMessage({ messageId, channelId });
};

// GET PINNED MESSAGES
exports.getPinnedMessages = async ({ channelId }) => {
  return messageModel.getPinnedMessages({ channelId });
};