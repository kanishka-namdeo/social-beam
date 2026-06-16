import { z } from 'zod';

const envSchema = z.object({
  // Required - Application Core
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // Required - External Services
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email'),

  // Required - Security & Encryption
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),
  TOKEN_ENCRYPTION_KEY: z.string().min(32, 'TOKEN_ENCRYPTION_KEY must be at least 32 characters'),
  MCP_JWT_SECRET: z.string().min(16, 'MCP_JWT_SECRET must be at least 16 characters'),

  // Required - Push Notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is required'),
  VAPID_PUBLIC_KEY: z.string().min(1, 'VAPID_PUBLIC_KEY is required'),
  VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY is required'),

  // Required - AI Model Configuration
  MODEL: z.string().min(1, 'MODEL is required'),
  FAST_MODEL: z.string().min(1, 'FAST_MODEL is required'),
  BASE_URL: z.string().url('BASE_URL must be a valid URL'),

  // Required - Stripe Price IDs
  STRIPE_PRICE_ID_AI_STARTER: z.string().min(1, 'STRIPE_PRICE_ID_AI_STARTER is required'),
  STRIPE_PRICE_ID_AI_PRO: z.string().min(1, 'STRIPE_PRICE_ID_AI_PRO is required'),

  // Optional - OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Optional - Storage (S3-compatible)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Optional - CloakBrowser
  CLOAKBROWSER_CDP_URL: z.string().url().optional().or(z.literal('')),

  // Optional - Monitoring & Debugging
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),

  // Optional - Display
  DISPLAY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    const formatted = result.error.format();
    console.error(JSON.stringify(formatted, null, 2));
    console.error('\nCheck .env file against .env.example for required variables.');
    throw new Error('Environment validation failed');
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function getEnv(): Env {
  if (!cachedEnv) {
    return validateEnv();
  }
  return cachedEnv;
}
