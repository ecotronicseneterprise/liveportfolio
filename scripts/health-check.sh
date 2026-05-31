#!/bin/bash
# Daily health check for liveportfolio.site
# Runs via cron on VPS. Sends email via Resend if anything is wrong (or daily summary).

APP_URL="https://liveportfolio.site"
HEALTH_URL="${APP_URL}/api/health"
RESEND_API_KEY="${RESEND_API_KEY}"
ALERT_EMAIL="nwannachumaclifford@gmail.com"
FROM_EMAIL="health@liveportfolio.site"

# ── Checks ────────────────────────────────────────────────────────────────────

TIMESTAMP=$(date '+%Y-%m-%d %H:%M UTC')
ISSUES=""
STATUS="OK"

# 1. HTTP health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL")
RESPONSE=$(curl -s --max-time 10 "$HEALTH_URL")

if [ "$HTTP_CODE" != "200" ]; then
  STATUS="DOWN"
  ISSUES="${ISSUES}<li>❌ <strong>/api/health returned HTTP ${HTTP_CODE}</strong> (expected 200)</li>"
fi

# 2. Response body contains expected content
if ! echo "$RESPONSE" | grep -q '"status"'; then
  STATUS="DEGRADED"
  ISSUES="${ISSUES}<li>⚠️ Health endpoint responded but body looks wrong: <code>${RESPONSE}</code></li>"
fi

# 3. PM2 process running (check via SSH if you add SSH key auth — skipped here for simplicity)

# 4. SSL certificate expiry (warn at 14 days)
EXPIRY=$(echo | openssl s_client -servername liveportfolio.site -connect liveportfolio.site:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$EXPIRY" ]; then
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  if [ "$DAYS_LEFT" -lt 14 ]; then
    STATUS="WARNING"
    ISSUES="${ISSUES}<li>⚠️ SSL cert expires in <strong>${DAYS_LEFT} days</strong> (${EXPIRY})</li>"
  fi
  SSL_INFO="SSL cert valid — expires in ${DAYS_LEFT} days (${EXPIRY})"
else
  SSL_INFO="SSL cert check skipped"
fi

# 5. Response time
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 15 "$HEALTH_URL")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null | cut -d. -f1)
if [ -n "$RESPONSE_MS" ] && [ "$RESPONSE_MS" -gt 5000 ]; then
  STATUS="SLOW"
  ISSUES="${ISSUES}<li>⚠️ Slow response: <strong>${RESPONSE_MS}ms</strong> (threshold: 5000ms)</li>"
fi

# ── Email ─────────────────────────────────────────────────────────────────────

if [ "$STATUS" = "OK" ]; then
  SUBJECT="✅ liveportfolio.site — All systems OK (${TIMESTAMP})"
  STATUS_COLOR="#16a34a"
  STATUS_LABEL="All systems operational"
  BODY_EXTRA="<p>No action needed. This is your daily confirmation the app is running.</p>"
else
  SUBJECT="🚨 liveportfolio.site — ${STATUS} detected (${TIMESTAMP})"
  STATUS_COLOR="#dc2626"
  STATUS_LABEL="Issues detected"
  BODY_EXTRA="
<h3 style='color:#dc2626;margin:16px 0 8px'>Issues found:</h3>
<ul style='margin:0;padding-left:20px;line-height:1.8'>${ISSUES}</ul>

<h3 style='margin:24px 0 8px'>Fix guide:</h3>
<pre style='background:#f4f4f4;padding:12px;border-radius:6px;font-size:13px;overflow:auto'>
# SSH into VPS
ssh deploy@46.225.186.103

# Check PM2 status
pm2 list

# If liveportfolio is stopped/errored:
pm2 restart liveportfolio

# Check recent logs for errors:
pm2 logs liveportfolio --lines 50

# If app won't start (build error):
cd /home/deploy/apps/liveportfolio
npm run build
pm2 restart liveportfolio

# If Caddy is down (502 errors):
sudo systemctl status caddy
sudo systemctl restart caddy

# Check disk space (full disk = crash):
df -h

# Check memory:
free -h
</pre>"
fi

EMAIL_BODY="{
  \"from\": \"liveportfolio health <${FROM_EMAIL}>\",
  \"to\": [\"${ALERT_EMAIL}\"],
  \"subject\": \"${SUBJECT}\",
  \"html\": \"<div style='font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px'>
    <div style='display:flex;align-items:center;gap:12px;margin-bottom:24px'>
      <div style='width:32px;height:32px;background:#0A66C2;border-radius:8px;display:flex;align-items:center;justify-content:center'>
        <svg width='20' height='20' viewBox='0 0 28 28' fill='none' xmlns='http://www.w3.org/2000/svg'><circle cx='14' cy='11' r='4.5' fill='white'/><path d='M5 24c0-4.97 4.03-9 9-9s9 4.03 9 9' stroke='white' stroke-width='2' stroke-linecap='round'/></svg>
      </div>
      <strong style='font-size:16px'>liveportfolio.site</strong>
    </div>
    <div style='padding:16px;border-radius:8px;background:${STATUS_COLOR}1a;border:1px solid ${STATUS_COLOR}40;margin-bottom:20px'>
      <strong style='color:${STATUS_COLOR}'>${STATUS_LABEL}</strong><br>
      <span style='color:#666;font-size:13px'>${TIMESTAMP}</span>
    </div>
    <table style='width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px'>
      <tr style='border-bottom:1px solid #eee'><td style='padding:8px 0;color:#666'>HTTP status</td><td style='padding:8px 0;font-weight:600'>${HTTP_CODE}</td></tr>
      <tr style='border-bottom:1px solid #eee'><td style='padding:8px 0;color:#666'>Response time</td><td style='padding:8px 0;font-weight:600'>${RESPONSE_MS}ms</td></tr>
      <tr><td style='padding:8px 0;color:#666'>SSL</td><td style='padding:8px 0;font-weight:600'>${SSL_INFO}</td></tr>
    </table>
    ${BODY_EXTRA}
    <p style='color:#999;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:16px'>
      Sent automatically every morning at 7:00 AM WAT.<br>
      App: <a href='${APP_URL}' style='color:#0A66C2'>${APP_URL}</a>
    </p>
  </div>\"
}"

curl -s -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$EMAIL_BODY" > /dev/null

echo "[${TIMESTAMP}] Health check complete — Status: ${STATUS} | HTTP: ${HTTP_CODE} | Response: ${RESPONSE_MS}ms"
