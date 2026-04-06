const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const apiRouter = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { requireAuth } = require('./middlewares/requireAuth');
const env = require('./config/env');


const app = express();

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') {
    return null;
  }

  const trimmed = origin.trim();

  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_error) {
    return trimmed.replace(/\/+$/, '');
  }
};

const allowedOrigins = (env.corsOrigin || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowAllOrigins = allowedOrigins.includes('*');

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowAllOrigins) {
      return callback(null, true);
    }

    const normalizedRequestOrigin = normalizeOrigin(origin);

    if (normalizedRequestOrigin && allowedOrigins.includes(normalizedRequestOrigin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Discord Messaging API',
  });
});

app.use('/api/v1', requireAuth);
app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
