import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // MTProto credentials
  apiId: parseInt(process.env.API_ID),
  apiHash: process.env.API_HASH,

  // API server settings
  apiHost: process.env.API_HOST || '0.0.0.0',
  apiPort: parseInt(process.env.API_PORT) || 8000,

  // Optional settings
  parseTimeout: parseInt(process.env.PARSE_TIMEOUT) || 30000,

  // Bot API settings (optional, for file URLs)
  botToken: process.env.BOT_TOKEN || null,
  botChatId: process.env.BOT_CHAT_ID || null,

  // Yandex Cloud Object Storage settings
  ycAccessKeyId: process.env.YC_ACCESS_KEY_ID || null,
  ycSecretAccessKey: process.env.YC_SECRET_ACCESS_KEY || null,
  ycBucket: process.env.YC_BUCKET || null,
  ycRegion: process.env.YC_REGION || 'ru-central1',
  ycEndpoint: process.env.YC_ENDPOINT || 'https://storage.yandexcloud.net',
  ycPublicBaseUrl: process.env.YC_PUBLIC_BASE_URL || null
};

// Validate required config
if (!config.apiId || isNaN(config.apiId)) {
  throw new Error('API_ID is required in .env file (get it from https://my.telegram.org)');
}

if (!config.apiHash) {
  throw new Error('API_HASH is required in .env file (get it from https://my.telegram.org)');
}
