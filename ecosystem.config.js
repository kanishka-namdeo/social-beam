// PM2 Ecosystem Configuration for Social Beam
// Usage: pm2 start ecosystem.config.js
//        pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'socialbeam-app',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: __dirname,
      instances: 1, // Next.js with stateful features should run as single instance
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Log configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart strategy
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
    },
  ],
};
