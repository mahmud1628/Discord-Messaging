const messageService = require('../../services/message.service');

const emitError = (socket, event, message) => {
  socket.emit('error', { event, message });
};

const registerPinHandlers = (io, socket) => {

  /**
   * PIN MESSAGE
   * Client emits:  message:pin    { messageId, channelId }
   * Server emits:  message:pinned { messageId, channelId, pinnedBy, pinnedAt }
   *   → broadcast to everyone in channel:<channelId>
   */
  socket.on('message:pin', async ({ messageId, channelId }) => {
    if (!messageId || !channelId) {
      return emitError(socket, 'message:pin', 'messageId and channelId are required');
    }

    try {
      const result = await messageService.pinMessage({
        messageId,
        channelId,
        pinnedBy: socket.user.userId,
      });

      if (result.rowCount === 0) {
        return emitError(socket, 'message:pin', 'Message is already pinned');
      }

      io.to(`channel:${channelId}`).emit('message:pinned', {
        messageId,
        channelId,
        pinnedBy: {
          id: socket.user.userId,
          username: socket.user.username,
        },
        pinnedAt: result.rows[0].pinned_at,
      });
    } catch (err) {
      console.error('[WS] message:pin error', err);
      emitError(socket, 'message:pin', err.message || 'Failed to pin message');
    }
  });

  /**
   * UNPIN MESSAGE
   * Client emits:  message:unpin    { messageId, channelId }
   * Server emits:  message:unpinned { messageId, channelId, unpinnedBy }
   *   → broadcast to everyone in channel:<channelId>
   */
  socket.on('message:unpin', async ({ messageId, channelId }) => {
    if (!messageId || !channelId) {
      return emitError(socket, 'message:unpin', 'messageId and channelId are required');
    }

    try {
      const result = await messageService.unpinMessage({ messageId, channelId });

      if (result.rowCount === 0) {
        return emitError(socket, 'message:unpin', 'Pinned message not found');
      }

      io.to(`channel:${channelId}`).emit('message:unpinned', {
        messageId,
        channelId,
        unpinnedBy: {
          id: socket.user.userId,
          username: socket.user.username,
        },
      });
    } catch (err) {
      console.error('[WS] message:unpin error', err);
      emitError(socket, 'message:unpin', err.message || 'Failed to unpin message');
    }
  });

};

module.exports = registerPinHandlers;
