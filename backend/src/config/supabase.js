const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

let supabaseClient;
let bucketReady = false;

const withSupabaseNetworkHint = (error) => {
  if (error?.message === 'fetch failed' || error?.cause?.code === 'ENOTFOUND') {
    const host = (() => {
      try {
        return new URL(env.supabaseUrl).host;
      } catch {
        return env.supabaseUrl || 'unknown-host';
      }
    })();

    const wrapped = new Error(
      `Unable to reach Supabase host (${host}). Verify SUPABASE_URL and DNS/network connectivity.`
    );
    wrapped.statusCode = 500;
    wrapped.cause = error;
    return wrapped;
  }

  return error;
};

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('Supabase configuration is missing');
  }

  supabaseClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
};

const ensureStorageBucket = async (bucketName) => {
  const client = getSupabaseClient();

  if (bucketReady) {
    return client;
  }

  const { data: buckets, error: listError } = await client.storage.listBuckets();

  if (listError) {
    throw withSupabaseNetworkHint(listError);
  }

  const exists = Array.isArray(buckets) && buckets.some((bucket) => bucket.name === bucketName);

  if (!exists) {
    const { error: createError } = await client.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });

    if (createError) {
      throw withSupabaseNetworkHint(createError);
    }
  }

  bucketReady = true;
  return client;
};

module.exports = {
  getSupabaseClient,
  ensureStorageBucket,
};