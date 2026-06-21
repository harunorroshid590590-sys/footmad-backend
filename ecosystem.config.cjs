// PM2 process config for the FootMad backend on the VPS.
// Usage on the server (from this folder):
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup
// Reads .env via dotenv (server.js calls dotenv.config()).
module.exports = {
  apps: [
    {
      name: 'footmad-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
