#!/bin/bash
# Run this ONCE on your VPS to install the daily health check cron job.
# Usage: bash install-monitoring.sh

set -e

APP_DIR="/home/deploy/apps/liveportfolio"
SCRIPT_PATH="${APP_DIR}/scripts/health-check.sh"

echo "📋 Installing liveportfolio health monitor..."

# Make script executable
chmod +x "$SCRIPT_PATH"

# Get the RESEND_API_KEY from the app's .env.local
RESEND_KEY=$(grep RESEND_API_KEY "${APP_DIR}/.env.local" | cut -d= -f2- | tr -d '"' | tr -d "'")

if [ -z "$RESEND_KEY" ]; then
  echo "❌ Could not read RESEND_API_KEY from .env.local"
  exit 1
fi

# Write cron entry — 6:00 AM UTC = 7:00 AM WAT (Nigeria, no DST)
CRON_JOB="0 6 * * * RESEND_API_KEY=${RESEND_KEY} ${SCRIPT_PATH} >> /home/deploy/logs/health-check.log 2>&1"

# Create log directory
mkdir -p /home/deploy/logs

# Add to crontab (avoid duplicates)
(crontab -l 2>/dev/null | grep -v "health-check.sh"; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed. Health check runs daily at 6:00 AM UTC (7:00 AM Lagos time)."
echo ""
echo "Test it now (runs immediately):"
echo "  RESEND_API_KEY=${RESEND_KEY} bash ${SCRIPT_PATH}"
echo ""
echo "View logs:"
echo "  tail -f /home/deploy/logs/health-check.log"
echo ""
echo "Check crontab:"
echo "  crontab -l"
