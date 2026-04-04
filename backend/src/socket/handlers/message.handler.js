const messageService = require('../../services/message.service');

const emitError = (socket, event, message) => {
  socket.emit('error', { event, message });
};

const registerMessageHandlers = (io, socket) => {

  /**
   * SEND MESSAGE
   * Client emits:  message:send  { serverId, channelId, content }
   * Server emits:  message:new   { id, channelId, content, author, createdAt }
   *   → broadcast to everyone in channel:<channelId>
   */
  socket.on('message:send', async ({ serverId, channelId, content }) => {
    if (!serverId || !channelId || !content?.trim()) {
      return emitError(socket, 'message:send', 'serverId, channelId and content are required');
    }

    try {
      const result = await messageService.sendMessage({
        serverId,
        channelId,
        authorId: socket.user.userId,
        content: content.trim(),
      });

      const message = result.rows[0];

      io.to(`channel:${channelId}`).emit('message:new', {
        id: message.id,
        channelId: message.channel_id,
        content: message.content,
        createdAt: message.created_at,
        author: {
          id: socket.user.userId,
          username: socket.user.username,
        },
      });
    } catch (err) {
      console.error('[WS] message:send error', err);
      emitError(socket, 'message:send', err.message || 'Failed to send message');
    }
  });

  /**
   * UPDATE MESSAGE
   * Client emits:  message:update  { channelId, messageId, content }
   * Server emits:  message:updated { messageId, channelId, content, editedAt }
   *   → broadcast to everyone in channel:<channelId>
   * Only the original author can update (enforced in messageService).
   */
  socket.on('message:update', async ({ channelId, messageId, content }) => {
    if (!channelId || !messageId || !content?.trim()) {
      return emitError(socket, 'message:update', 'channelId, messageId and content are required');
    }

    try {
      const result = await messageService.updateMessage({
        channelId,
        messageId,
        userId: socket.user.userId,
        content: content.trim(),
        hasContent: true,
        deleteAttachmentIds: [],
      });

      if (!result) {
        return emitError(socket, 'message:update', 'Message not found');
      }

      if (result.forbidden) {
        return emitError(socket, 'message:update', 'Not allowed to edit this message');
      }

      const message = result.message;

      io.to(`channel:${channelId}`).emit('message:updated', {
        messageId: message.id,
        channelId: message.channel_id,
        content: message.content,
        editedAt: message.edited_at,
      });
    } catch (err) {
      console.error('[WS] message:update error', err);
      emitError(socket, 'message:update', err.message || 'Failed to update message');
    }
  });

  /**
   * DELETE MESSAGE
   * Client emits:  message:delete  { channelId, messageId }
   * Server emits:  message:deleted { messageId, channelId }
   *   → broadcast to everyone in channel:<channelId>
   * Only the original author can delete (enforced in messageService).
   */
  socket.on('message:delete', async ({ channelId, messageId }) => {
    if (!channelId || !messageId) {
      return emitError(socket, 'message:delete', 'channelId and messageId are required');
    }

    try {
      const result = await messageService.deleteMessage({
        channelId,
        messageId,
        userId: socket.user.userId,
      });

      if (!result) {
        return emitError(socket, 'message:delete', 'Message not found');
      }

      if (result.forbidden) {
        return emitError(socket, 'message:delete', 'Not allowed to delete this message');
      }

      io.to(`channel:${channelId}`).emit('message:deleted', {
        messageId,
        channelId,
      });
    } catch (err) {
      console.error('[WS] message:delete error', err);
      emitError(socket, 'message:delete', err.message || 'Failed to delete message');
    }
  });

};

module.exports = registerMessageHandlers;
