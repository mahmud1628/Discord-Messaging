const messageService = require('../../services/message.service');

const emitError = (socket, event, message) => {
  socket.emit('error', { event, message });
};

const registerReactionHandlers = (io, socket) => {

  /**
   * ADD REACTION
   * Client emits:  reaction:add    { messageId, channelId, emoji }
   * Server emits:  reaction:added  { messageId, channelId, emoji, user }
   *   → broadcast to everyone in channel:<channelId>
   */
  socket.on('reaction:add', async ({ messageId, channelId, emoji }) => {
    if (!messageId || !channelId || !emoji) {
      return emitError(socket, 'reaction:add', 'messageId, channelId and emoji are required');
    }

    try {
      await messageService.addReaction({
        messageId,
        userId: socket.user.userId,
        emoji,
      });

      io.to(`channel:${channelId}`).emit('reaction:added', {
        messageId,
        channelId,
        emoji,
        user: {
          id: socket.user.userId,
          username: socket.user.username,
        },
      });
    } catch (err) {
      console.error('[WS] reaction:add error', err);
      emitError(socket, 'reaction:add', err.message || 'Failed to add reaction');
    }
  });

  /**
   * REMOVE REACTION
   * Client emits:  reaction:remove   { messageId, channelId, emoji }
   * Server emits:  reaction:removed  { messageId, channelId, emoji, userId }
   *   → broadcast to everyone in channel:<channelId>
   */
  socket.on('reaction:remove', async ({ messageId, channelId, emoji }) => {
    if (!messageId || !channelId || !emoji) {
      return emitError(socket, 'reaction:remove', 'messageId, channelId and emoji are required');
    }

    try {
      await messageService.removeReaction({
        messageId,
        userId: socket.user.userId,
        emoji,
      });

      io.to(`channel:${channelId}`).emit('reaction:removed', {
        messageId,
        channelId,
        emoji,
        userId: socket.user.userId,
      });
    } catch (err) {
      console.error('[WS] reaction:remove error', err);
      emitError(socket, 'reaction:remove', err.message || 'Failed to remove reaction');
    }
  });

};

module.exports = registerReactionHandlers;
