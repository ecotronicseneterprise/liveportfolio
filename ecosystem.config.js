module.exports = {
  apps: [
    {
      name: 'liveportfolio',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '512M',
      error_file: '/home/deploy/logs/liveportfolio-error.log',
      out_file: '/home/deploy/logs/liveportfolio-out.log',
    },
  ],
}
