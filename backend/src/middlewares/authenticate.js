const jwt = require('jsonwebtoken');

const env = require('../config/env');
const authModel = require('../models/auth.model');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const extractBearerToken = (authorizationHeader = '') => {
  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const authenticateAccessToken = async (req, _res, next) => {
  try {
    if (!env.jwtSecret) {
      throw createHttpError(500, 'JWT configuration is missing');
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw createHttpError(401, 'Authorization token is required');
    }

    const token = extractBearerToken(authHeader);

    if (!token) {
      throw createHttpError(401, 'Invalid authorization format. Use Bearer <token>');
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    if (decoded.type !== 'access' || !decoded.jti || !decoded.exp) {
      throw createHttpError(401, 'Invalid token');
    }

    const revoked = await authModel.isAccessTokenRevoked(decoded.jti);
    if (revoked.rowCount > 0) {
      throw createHttpError(401, 'Token has been revoked');
    }

    req.auth = {
      userId: decoded.sub,
      email: decoded.email,
      username: decoded.username,
      tokenId: decoded.jti,
      tokenExpiresAtEpochSeconds: decoded.exp,
      token,
      payload: decoded,
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(createHttpError(401, 'Token has expired'));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(createHttpError(401, 'Invalid token'));
    }

    return next(error);
  }
};

module.exports = {
  authenticateAccessToken,
};
