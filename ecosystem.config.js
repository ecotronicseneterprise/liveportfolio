module.exports = {
  apps: [
    {
      name: 'liveportfolio',
      cwd: '/home/deploy/apps/liveportfolio',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      max_memory_restart: '512M',
      error_file: '/home/deploy/logs/liveportfolio-error.log',
      out_file: '/home/deploy/logs/liveportfolio-out.log',
    },
  ],
}
