export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET ?? 'change-me',
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '900s',
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET ?? 'change-me-refresh',
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? '7d',
  },
  redis: {
    url: process.env.REDIS_URL ?? '',
  },
  n8n: {
    baseUrl: process.env.N8N_BASE_URL ?? '',
  },
  tenancy: {
    baseDomain: process.env.BASE_DOMAIN ?? '',
  },
});


