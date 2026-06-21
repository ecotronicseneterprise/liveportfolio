#!/bin/bash
# Runs on VPS after rsync — called via forced-command SSH key.
# Replaces the appleboy/ssh-action step in ci-deploy.yml.
set -e

cd /home/deploy/apps
test -d liveportfolio__incoming || { echo "ERROR: liveportfolio__incoming missing"; exit 1; }

# Preserve .env.local across deploys
if [ -d liveportfolio ] && [ -f liveportfolio/.env.local ]; then
  cp liveportfolio/.env.local liveportfolio__incoming/.env.local
fi

# Reuse existing node_modules
if [ -d liveportfolio/node_modules ]; then
  mv liveportfolio/node_modules liveportfolio__incoming/node_modules
fi

# Swap releases
rm -rf liveportfolio__previous 2>/dev/null || true
[ -d liveportfolio ] && mv liveportfolio liveportfolio__previous
mv liveportfolio__incoming liveportfolio

cd /home/deploy/apps/liveportfolio

# npm install only if package.json changed
PREV_PKG="/home/deploy/apps/liveportfolio__previous/package.json"
CURR_PKG="/home/deploy/apps/liveportfolio/package.json"
if [ ! -d node_modules ] || ! diff -q "$PREV_PKG" "$CURR_PKG" > /dev/null 2>&1; then
  echo "package.json changed — running npm install"
  if ! swapon --show | grep -q /swapfile; then
    sudo swapon /swapfile 2>/dev/null || true
  fi
  npm install --omit=dev || {
    echo "npm install failed — rolling back"
    cd /home/deploy/apps
    rm -rf liveportfolio
    [ -d liveportfolio__previous ] && mv liveportfolio__previous liveportfolio
    exit 1
  }
fi

set -a
source /home/deploy/apps/liveportfolio/.env.local
set +a

if pm2 list | grep -q "liveportfolio"; then
  pm2 reload liveportfolio --update-env
else
  pm2 start /home/deploy/apps/liveportfolio/ecosystem.config.js --env production --update-env
fi

chmod +x /home/deploy/apps/liveportfolio/scripts/health-check.sh
chmod +x /home/deploy/apps/liveportfolio/scripts/check-security.sh
mkdir -p /home/deploy/logs

echo "Deploy complete."
