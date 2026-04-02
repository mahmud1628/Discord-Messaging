const dotenv = require('dotenv');

dotenv.config();

const cleanEnv = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
};

const env = {
  nodeEnv: cleanEnv(process.env.NODE_ENV),
  port: Number(process.env.PORT),
  corsOrigin: cleanEnv(process.env.CORS_ORIGIN),
  databaseUrl: cleanEnv(process.env.DATABASE_URL),
  jwtSecret: cleanEnv(process.env.JWT_SECRET),
  jwtExpiresIn: cleanEnv(process.env.JWT_EXPIRES_IN) || '7d',
  supabaseUrl: cleanEnv(process.env.SUPABASE_URL),
  supabaseServiceRoleKey: cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
  supabaseStorageBucket: cleanEnv(process.env.SUPABASE_STORAGE_BUCKET) || 'chat-attachments',
};

module.exports = env;
