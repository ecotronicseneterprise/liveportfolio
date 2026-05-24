#!/bin/bash
set -e

echo "Pulling latest code..."
git pull

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo "Reloading PM2..."
pm2 reload liveportfolio

echo "Done. App is live at https://liveportfolio.site"
