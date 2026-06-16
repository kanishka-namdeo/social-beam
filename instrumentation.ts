import * as Sentry from '@sentry/nextjs';

export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables at startup (fail fast)
    const { validateEnv } = await import('./lib/env');
    validateEnv();

    const { logger } = await import('./lib/logger');
    console.log = (...args: unknown[]) => logger.info(args.join(' '));
    console.error = (...args: unknown[]) => logger.error(args.join(' '));
    console.warn = (...args: unknown[]) => logger.warn(args.join(' '));
    console.debug = (...args: unknown[]) => logger.debug(args.join(' '));

    // Initialize OpenTelemetry for distributed tracing (only when explicitly enabled)
    if (process.env.OTEL_ENABLED === "true") {
      const { initOpenTelemetry } = await import('./lib/opentelemetry');
      await initOpenTelemetry();
    }

    // Recover orphaned processes from previous server restarts
    const { recoverOrphanedProcesses } = await import('./lib/processes/process-manager');
    await recoverOrphanedProcesses();

    // Initialize PostgresSaver checkpointer tables at server startup
    const { setupCheckpointer } = await import('./lib/agent/graph');
    await setupCheckpointer();

    // Start Reddit trending cron job
    const { startRedditTrendingCron } = await import('./lib/cron/reddit-trending');
    startRedditTrendingCron();

    // Start brand learning cron job
    const { startBrandLearningCron } = await import('./lib/cron/brand-learning');
    startBrandLearningCron();

    // Start LinkedIn scraper self-healer cron job
    const { startLinkedInScraperHealerCron } = await import('./lib/cron/linkedin-scraper-healer');
    startLinkedInScraperHealerCron();
  }
}
