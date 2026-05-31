#!/bin/bash
set -e

echo "Installing production dependencies..."
npm install --production

echo "Reloading PM2..."
pm2 reload liveportfolio || pm2 start ecosystem.config.js --env production

echo "Done. App is live at https://liveportfolio.site"
