#!/bin/bash
set -e

if [ ! -d ".next" ]; then
  if [ -d "app" ] || [ -d "pages" ]; then
    echo "No .next build found. Building on this server..."
    npm ci
    npm run build
  else
    echo "ERROR: No .next build found and no source (app/ or pages/) present."
    echo "Re-deploy build artifacts ('.next') or deploy the full repo and run 'npm run build'."
    exit 1
  fi
fi

echo "Installing production dependencies (omit dev)..."
npm ci --omit=dev

echo "Reloading PM2..."
pm2 startOrReload ecosystem.config.js --env production --update-env

echo "Done. App is live at https://liveportfolio.site"
