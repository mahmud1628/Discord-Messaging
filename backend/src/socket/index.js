const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authModel = require('../models/auth.model');
const registerMessageHandlers = require('./handlers/message.handler');
const registerReactionHandlers = require('./handlers/reaction.handler');
const registerPinHandlers = require('./handlers/pin.handler');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: env.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  // ── JWT Auth Middleware ──────────────────────────────────────
  // Reuses the same verify + revocation check as the REST middleware.
  // Runs on every connection handshake before the socket is accepted.
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = jwt.verify(token, env.jwtSecret);

      if (decoded.type !== 'access' || !decoded.jti || !decoded.exp) {
        return next(new Error('Invalid token'));
      }

      const revoked = await authModel.isAccessTokenRevoked(decoded.jti);
      if (revoked.rowCount > 0) {
        return next(new Error('Token has been revoked'));
      }

      // Attach user info to socket — accessible in all handlers
      socket.user = {
        userId: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        tokenId: decoded.jti,
      };

      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Token has expired'));
      }
      return next(new Error('Invalid token'));
    }
  });

  // ── Connection ───────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.user.username} (${socket.id})`);

    // Client must emit channel:join after connecting to receive channel events.
    // Room name pattern: "channel:<channelId>"
    socket.on('channel:join', (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`[WS] ${socket.user.username} joined channel:${channelId}`);
    });

    socket.on('channel:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
      console.log(`[WS] ${socket.user.username} left channel:${channelId}`);
    });

    registerMessageHandlers(io, socket);
    registerReactionHandlers(io, socket);
    registerPinHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[WS] Disconnected: ${socket.user.username} — ${reason}`);
    });
  });

  return io;
};

module.exports = initSocket;
