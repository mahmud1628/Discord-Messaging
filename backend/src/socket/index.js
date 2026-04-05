const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authModel = require('../models/auth.model');
const { setIO } = require('./io');

const onlineUsers = new Map();

const getOnlineUserIds = () =>
  Array.from(onlineUsers.entries())
    .filter(([, count]) => count > 0)
    .map(([userId]) => userId);

const initSocket = (server) => {
  const allowedOrigins = (env.corsOrigin || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
      methods: ['GET', 'POST'],
      credentials: true,
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

  setIO(io);

  // ── Connection ───────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = String(socket.user.userId);
    const nextCount = (onlineUsers.get(userId) || 0) + 1;
    onlineUsers.set(userId, nextCount);

    socket.emit('presence:state', {
      onlineUserIds: getOnlineUserIds(),
    });

    if (nextCount === 1) {
      io.emit('presence:update', {
        userId,
        status: 'online',
      });
    }

    // console.log(`[WS] Connected: ${socket.user.username} (${socket.id})`);

    // Client must emit channel:join after connecting to receive channel events.
    // Room name pattern: "channel:<channelId>"
    socket.on('channel:join', (channelId) => {
      socket.join(`channel:${channelId}`);
      // console.log(`[WS] ${socket.user.username} joined channel:${channelId}`);
    });

    socket.on('channel:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
      // console.log(`[WS] ${socket.user.username} left channel:${channelId}`);
    });

    socket.on('disconnect', (reason) => {
      const currentCount = onlineUsers.get(userId) || 0;

      if (currentCount <= 1) {
        onlineUsers.delete(userId);
        io.emit('presence:update', {
          userId,
          status: 'offline',
        });
      } else {
        onlineUsers.set(userId, currentCount - 1);
      }

      // console.log(`[WS] Disconnected: ${socket.user.username} — ${reason}`);
    });
  });

  return io;
};

module.exports = initSocket;
