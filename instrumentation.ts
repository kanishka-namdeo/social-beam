export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('./lib/logger');
    console.log = (...args: unknown[]) => logger.info(args.join(' '));
    console.error = (...args: unknown[]) => logger.error(args.join(' '));
    console.warn = (...args: unknown[]) => logger.warn(args.join(' '));
    console.debug = (...args: unknown[]) => logger.debug(args.join(' '));

    // Initialize PostgresSaver checkpointer tables at server startup
    const { setupCheckpointer } = await import('./lib/agent/graph');
    await setupCheckpointer();

    // Start Reddit trending cron job
    const { startRedditTrendingCron } = await import('./lib/cron/reddit-trending');
    startRedditTrendingCron();
  }
}
