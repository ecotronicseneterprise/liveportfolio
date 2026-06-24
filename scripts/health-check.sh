#!/bin/bash
# liveportfolio.site — Daily SaaS dashboard + health check
# Sends a rich HTML email with all key metrics via Resend
# Runs daily at 6:00 AM UTC (7:00 AM Lagos time) via cron

set +e

# Load secrets from .env.local — keeps crontab free of plaintext secrets
ENV_FILE="/home/deploy/apps/liveportfolio/.env.local"
if [ -f "$ENV_FILE" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

APP_URL="https://liveportfolio.site"
LOCAL_URL="http://localhost:3001"
HEALTH_URL="${LOCAL_URL}/api/health"
METRICS_URL="${LOCAL_URL}/api/admin/metrics"
VPS_HEALTH_URL="${LOCAL_URL}/api/admin/vps-health"
ALERT_EMAIL="nwannachumaclifford@gmail.com"
FROM_EMAIL="dashboard@liveportfolio.site"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M UTC')
DATE_LABEL=$(date '+%A, %d %B %Y')

# ── 1. Uptime check ────────────────────────────────────────────────────────────
HTTP_CODE=$(curl -4 -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" || echo "000")
RESPONSE_TIME_RAW=$(curl -4 -s -o /dev/null -w "%{time_total}" --max-time 15 "$HEALTH_URL" || echo "0")
RESPONSE_MS=$(echo "$RESPONSE_TIME_RAW * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "?")

APP_STATUS="UP"
APP_STATUS_COLOR="#16a34a"
APP_STATUS_LABEL="Online"
if [ "$HTTP_CODE" != "200" ]; then
  APP_STATUS="DOWN"
  APP_STATUS_COLOR="#dc2626"
  APP_STATUS_LABEL="DOWN — HTTP ${HTTP_CODE}"
fi

# ── 2. SSL check ───────────────────────────────────────────────────────────────
SSL_INFO="Unknown"
DAYS_LEFT="?"
EXPIRY=$(echo | openssl s_client -servername liveportfolio.site -connect liveportfolio.site:443 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
SSL_ALERT=0
if [ -n "$EXPIRY" ]; then
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  SSL_INFO="${DAYS_LEFT} days remaining"
  if [ "$DAYS_LEFT" -lt 14 ]; then
    APP_STATUS="WARNING"
    APP_STATUS_COLOR="#d97706"
    APP_STATUS_LABEL="SSL expires in ${DAYS_LEFT} days!"
    SSL_ALERT=1
  fi
fi

# ── 3. Pull SaaS metrics ───────────────────────────────────────────────────────
# curl exits 137 (OOM-killed) on this VPS for localhost requests — use Node instead
METRICS_JSON=$(node -e "
  const http = require('http');
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/metrics',
    method: 'GET',
    headers: { 'x-metrics-secret': process.env.ADMIN_METRICS_SECRET || '' },
    timeout: 15000
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => process.stdout.write(body));
  });
  req.on('error', () => process.stdout.write('{}'));
  req.on('timeout', () => { req.destroy(); process.stdout.write('{}'); });
  req.end();
" 2>/dev/null || echo "{}")

echo "$METRICS_JSON" > /tmp/lp_metrics.json

USERS_TOTAL=$(python3   -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('users',{}).get('total','?'))"   2>/dev/null || echo "?")
USERS_TODAY=$(python3   -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('users',{}).get('today','?'))"   2>/dev/null || echo "?")
USERS_7D=$(python3      -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('users',{}).get('last_7_days','?'))"  2>/dev/null || echo "?")
USERS_30D=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('users',{}).get('last_30_days','?'))" 2>/dev/null || echo "?")

# FIX 1: revenue fields are now _ngn
REV_TOTAL=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('revenue',{}).get('total_ngn','?'))"          2>/dev/null || echo "?")
REV_MONTH=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('revenue',{}).get('this_month_ngn','?'))"      2>/dev/null || echo "?")
REV_PAYMENTS=$(python3  -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('revenue',{}).get('total_payments','?'))"      2>/dev/null || echo "?")
REV_MO_COUNT=$(python3  -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('revenue',{}).get('this_month_payments','?'))" 2>/dev/null || echo "?")

PUB_TOTAL=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('published',{}).get('total','?'))"              2>/dev/null || echo "?")
PUB_7D=$(python3        -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('published',{}).get('last_7_days','?'))"         2>/dev/null || echo "?")
CONV_RATE=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('published',{}).get('conversion_rate_pct','?'))" 2>/dev/null || echo "?")

SUBS_TOTAL=$(python3    -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('subscribers',{}).get('total','?'))"     2>/dev/null || echo "?")
SUBS_TODAY=$(python3    -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('subscribers',{}).get('today','?'))"     2>/dev/null || echo "?")
SUBS_7D=$(python3       -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('subscribers',{}).get('last_7_days','?'))" 2>/dev/null || echo "?")

PORT_TOTAL=$(python3    -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('portfolios',{}).get('total','?'))"           2>/dev/null || echo "?")
PORT_VIEWS=$(python3    -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('portfolios',{}).get('total_views','?'))"      2>/dev/null || echo "?")
PORT_HEALTH=$(python3   -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('portfolios',{}).get('avg_health_score','?'))" 2>/dev/null || echo "?")
TPL_MINIMAL=$(python3   -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('portfolios',{}).get('template_minimal','?'))" 2>/dev/null || echo "?")
TPL_BOLD=$(python3      -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('portfolios',{}).get('template_bold','?'))"    2>/dev/null || echo "?")

# FIX 3: subscription health
SUB_BASIC=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('subscriptions',{}).get('active_basic','?'))"          2>/dev/null || echo "?")
SUB_PRO=$(python3       -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('subscriptions',{}).get('active_pro','?'))"            2>/dev/null || echo "?")
SUB_CANCEL=$(python3    -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('subscriptions',{}).get('cancelled_this_month','?'))"  2>/dev/null || echo "?")
SUB_EXPIRE=$(python3    -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('subscriptions',{}).get('expiring_in_30_days','?'))"   2>/dev/null || echo "?")

# FIX 6: additional data points
UNIQUE_VISITORS=$(python3  -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('analytics',{}).get('unique_visitors_30d','?'))"       2>/dev/null || echo "?")
CAREER_SCORES=$(python3    -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('analytics',{}).get('career_scores_this_month','?'))"  2>/dev/null || echo "?")
FREE_UNPUB=$(python3       -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('analytics',{}).get('free_unpublished_count','?'))"    2>/dev/null || echo "?")
TOP_WEEK_NAME=$(python3    -c "import json; d=json.load(open('/tmp/lp_metrics.json')); tw=d.get('analytics',{}).get('top_viewed_this_week'); print(tw.get('name','?') if tw else 'N/A')" 2>/dev/null || echo "?")
TOP_WEEK_VIEWS=$(python3   -c "import json; d=json.load(open('/tmp/lp_metrics.json')); tw=d.get('analytics',{}).get('top_viewed_this_week'); print(tw.get('views','?') if tw else '0')"  2>/dev/null || echo "?")

# FIX 6: Free unpublished sample as HTML rows
FREE_UNPUB_ROWS=$(python3 -c "
import json
from datetime import datetime
try:
  d = json.load(open('/tmp/lp_metrics.json'))
  rows = ''
  for i, u in enumerate(d.get('analytics',{}).get('free_unpublished_sample',[])):
    bg = '#fff7ed' if i % 2 == 0 else '#ffffff'
    rows += f\"<tr style='background:{bg}'><td style='padding:7px 12px;font-size:12px;color:#374151'>{u.get('email','?')}</td><td style='padding:7px 12px;font-size:12px;color:#9a3412;text-align:right'>{u.get('days_since_signup','?')}d ago</td></tr>\"
  print(rows if rows else '<tr><td colspan=2 style=\"padding:7px 12px;color:#9ca3af\">None</td></tr>')
except:
  print('<tr><td colspan=2 style=\"padding:7px 12px;color:#9ca3af\">No data</td></tr>')
" 2>/dev/null || echo "<tr><td colspan=2>?</td></tr>")

# Full signup list — all users for dropdown + CSV
ALL_SIGNUPS_COUNT=$(python3 -c "
import json
try:
  d = json.load(open('/tmp/lp_metrics.json'))
  print(len(d.get('all_signups', [])))
except:
  print(0)
" 2>/dev/null || echo "0")

# Build full signup table rows (all users, for <details> dropdown)
ALL_SIGNUPS_ROWS=$(python3 -c "
import json
from datetime import datetime
try:
  d = json.load(open('/tmp/lp_metrics.json'))
  rows = ''
  for i, u in enumerate(d.get('all_signups', [])):
    bg = '#f9fafb' if i % 2 == 0 else '#ffffff'
    plan = u.get('plan','?')
    plan_color = '#16a34a' if plan in ('basic','pro') else '#6b7280'
    try:
      dt = datetime.fromisoformat(u.get('joined','').replace('Z','+00:00'))
      joined = dt.strftime('%d %b %Y, %H:%M')
    except:
      joined = u.get('joined','?')[:10]
    rows += f\"<tr style='background:{bg}'><td style='padding:6px 10px;font-size:11px;color:#374151'>{u.get('email','?')}</td><td style='padding:6px 10px;font-size:11px;color:#0A66C2'>/{u.get('slug','?')}</td><td style='padding:6px 10px;font-size:11px;color:{plan_color};font-weight:600;text-align:center'>{plan}</td><td style='padding:6px 10px;font-size:11px;color:#6b7280;text-align:right'>{joined}</td></tr>\"
  print(rows)
except:
  print('<tr><td colspan=4 style=\"padding:6px 10px;color:#9ca3af\">No data</td></tr>')
" 2>/dev/null || echo "<tr><td colspan=4>?</td></tr>")

# Generate CSV if user count > 100
CSV_FILE=""
if [ "$ALL_SIGNUPS_COUNT" -gt 100 ] 2>/dev/null; then
  CSV_FILE="/tmp/lp_signups_$(date +%Y%m%d).csv"
  python3 -c "
import json, csv
from datetime import datetime
try:
  d = json.load(open('/tmp/lp_metrics.json'))
  with open('$CSV_FILE', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['Email', 'Slug', 'Plan', 'Joined'])
    for u in d.get('all_signups', []):
      try:
        dt = datetime.fromisoformat(u.get('joined','').replace('Z','+00:00'))
        joined = dt.strftime('%Y-%m-%d %H:%M')
      except:
        joined = u.get('joined','')[:10]
      w.writerow([u.get('email',''), u.get('slug',''), u.get('plan',''), joined])
except Exception as e:
  print(e)
" 2>/dev/null
fi

# Top viewed portfolios as HTML rows
TOP_VIEWED_ROWS=$(python3 -c "
import json
try:
  d = json.load(open('/tmp/lp_metrics.json'))
  rows = ''
  for i, p in enumerate(d.get('top_viewed', [])):
    bg = '#f9fafb' if i % 2 == 0 else '#ffffff'
    rows += f\"<tr style='background:{bg}'><td style='padding:8px 12px;font-size:13px;color:#374151'>{p.get('name','?')}</td><td style='padding:8px 12px;font-size:13px;color:#374151;text-align:center'>{p.get('views','?')}</td><td style='padding:8px 12px;font-size:13px;color:#6b7280;text-align:center'>{p.get('template','?')}</td></tr>\"
  print(rows)
except Exception as e:
  print('<tr><td colspan=3 style=\"padding:8px 12px;color:#9ca3af\">No data</td></tr>')
" 2>/dev/null || echo "<tr><td colspan=3>?</td></tr>")

# Recent signups as HTML rows
RECENT_SIGNUPS_ROWS=$(python3 -c "
import json
from datetime import datetime
try:
  d = json.load(open('/tmp/lp_metrics.json'))
  rows = ''
  for i, u in enumerate(d.get('recent_signups', [])):
    bg = '#f9fafb' if i % 2 == 0 else '#ffffff'
    plan = u.get('plan','?')
    plan_color = '#16a34a' if plan in ('basic','pro') else '#6b7280'
    try:
      dt = datetime.fromisoformat(u.get('joined','').replace('Z','+00:00'))
      joined = dt.strftime('%d %b, %H:%M')
    except:
      joined = u.get('joined','?')[:10]
    rows += f\"<tr style='background:{bg}'><td style='padding:8px 12px;font-size:12px;color:#374151'>{u.get('email','?')}</td><td style='padding:8px 12px;font-size:12px;color:#0A66C2'>/{u.get('slug','?')}</td><td style='padding:8px 12px;font-size:12px;color:{plan_color};font-weight:600;text-align:center'>{plan}</td><td style='padding:8px 12px;font-size:12px;color:#6b7280;text-align:right'>{joined}</td></tr>\"
  print(rows)
except:
  print('<tr><td colspan=4 style=\"padding:8px 12px;color:#9ca3af\">No data</td></tr>')
" 2>/dev/null || echo "<tr><td colspan=4>?</td></tr>")

# FIX 1: recent payments rows — amount_ngn with ₦ symbol
RECENT_PAYMENTS_ROWS=$(python3 -c "
import json
from datetime import datetime
try:
  d = json.load(open('/tmp/lp_metrics.json'))
  rows = ''
  for i, p in enumerate(d.get('recent_payments', [])):
    bg = '#f9fafb' if i % 2 == 0 else '#ffffff'
    try:
      dt = datetime.fromisoformat(p.get('date','').replace('Z','+00:00'))
      date = dt.strftime('%d %b, %H:%M')
    except:
      date = p.get('date','?')[:10]
    amount = p.get('amount_ngn','?')
    try:
      amount_fmt = '₦{:,.2f}'.format(float(amount))
    except:
      amount_fmt = '₦' + str(amount)
    rows += f\"<tr style='background:{bg}'><td style='padding:8px 12px;font-size:13px;color:#16a34a;font-weight:700'>{amount_fmt}</td><td style='padding:8px 12px;font-size:12px;color:#374151'>{p.get('tier','?')}</td><td style='padding:8px 12px;font-size:12px;color:#6b7280;text-align:right'>{date}</td></tr>\"
  print(rows)
except:
  print('<tr><td colspan=3 style=\"padding:8px 12px;color:#9ca3af\">No data</td></tr>')
" 2>/dev/null || echo "<tr><td colspan=3>?</td></tr>")

# ── 4. Pull VPS health (FIX 4 & 5) ───────────────────────────────────────────
# curl exits 137 (OOM-killed) on this VPS for localhost requests — use Node instead
VPS_JSON=$(node -e "
  const http = require('http');
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/vps-health',
    method: 'GET',
    headers: { 'x-metrics-secret': process.env.ADMIN_METRICS_SECRET || '' },
    timeout: 10000
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => process.stdout.write(body));
  });
  req.on('error', () => process.stdout.write('{}'));
  req.on('timeout', () => { req.destroy(); process.stdout.write('{}'); });
  req.end();
" 2>/dev/null || echo "{}")

echo "$VPS_JSON" > /tmp/lp_vps.json

VPS_UPTIME_S=$(python3  -c "import json; d=json.load(open('/tmp/lp_vps.json')); print(d.get('uptime_seconds','?'))"           2>/dev/null || echo "?")
VPS_MEM_USED=$(python3  -c "import json; d=json.load(open('/tmp/lp_vps.json')); print(d.get('memory',{}).get('used_mb','?'))"  2>/dev/null || echo "?")
VPS_MEM_TOT=$(python3   -c "import json; d=json.load(open('/tmp/lp_vps.json')); print(d.get('memory',{}).get('total_mb','?'))" 2>/dev/null || echo "?")
VPS_MEM_PCT=$(python3   -c "import json; d=json.load(open('/tmp/lp_vps.json')); print(d.get('memory',{}).get('pct','?'))"      2>/dev/null || echo "?")
VPS_LOAD=$(python3      -c "import json; d=json.load(open('/tmp/lp_vps.json')); print(d.get('load_avg_1m','?'))"               2>/dev/null || echo "?")
VPS_DISK_USED=$(python3 -c "import json; d=json.load(open('/tmp/lp_vps.json')); print(d.get('disk',{}).get('used_gb','?'))"    2>/dev/null || echo "?")
VPS_DISK_TOT=$(python3  -c "import json; d=json.load(open('/tmp/lp_vps.json')); print(d.get('disk',{}).get('total_gb','?'))"   2>/dev/null || echo "?")
VPS_DISK_PCT=$(python3  -c "import json; d=json.load(open('/tmp/lp_vps.json')); print(d.get('disk',{}).get('pct','?'))"        2>/dev/null || echo "?")

# Convert uptime seconds to human readable
VPS_UPTIME_HR=$(python3 -c "
s = $VPS_UPTIME_S
try:
  s = int(s)
  d, r = divmod(s, 86400)
  h, r = divmod(r, 3600)
  print(f'{d}d {h}h')
except:
  print('?')
" 2>/dev/null || echo "?")

# PM2 processes as HTML rows
PM2_ROWS=$(python3 -c "
import json
try:
  d = json.load(open('/tmp/lp_vps.json'))
  rows = ''
  for i, p in enumerate(d.get('pm2_processes', [])):
    bg = '#f9fafb' if i % 2 == 0 else '#ffffff'
    status = p.get('status','?')
    status_color = '#16a34a' if status == 'online' else '#dc2626'
    up_s = p.get('uptime_seconds', 0)
    try:
      up_s = int(up_s)
      days, r = divmod(up_s, 86400)
      hours, _ = divmod(r, 3600)
      uptime = f'{days}d {hours}h'
    except:
      uptime = '?'
    rows += f\"<tr style='background:{bg}'><td style='padding:7px 12px;font-size:12px;font-weight:600;color:#111827'>{p.get('name','?')}</td><td style='padding:7px 12px;font-size:12px;font-weight:700;color:{status_color}'>{status}</td><td style='padding:7px 12px;font-size:12px;color:#6b7280;text-align:center'>{p.get('restarts','?')}</td><td style='padding:7px 12px;font-size:12px;color:#6b7280;text-align:center'>{uptime}</td><td style='padding:7px 12px;font-size:12px;color:#374151;text-align:right'>{p.get('memory_mb','?')}MB</td></tr>\"
  print(rows if rows else '<tr><td colspan=5 style=\"padding:7px 12px;color:#9ca3af\">pm2 unavailable</td></tr>')
except:
  print('<tr><td colspan=5 style=\"padding:7px 12px;color:#9ca3af\">No data</td></tr>')
" 2>/dev/null || echo "<tr><td colspan=5>?</td></tr>")

# ── 5. Security audit ─────────────────────────────────────────────────────────

# Known-good SSH key fingerprints (last token of each authorized_keys line)
# Update these if you legitimately rotate keys
KNOWN_KEY_1="AAAAC3NzaC1lZDI1NTE5AAAAIEDgN/BvoDqFCrQS0a43rfwdd+lv8mFSFv3w4rd3IBsW"  # clifford@hetzner
KNOWN_KEY_2="AAAAC3NzaC1lZDI1NTE5AAAAIAvBNnRcHUHkzEyi+N1PCD7qZ8YkZEd3mSZD3Hmu1xmi"  # github-actions-liveportfolio-4
KNOWN_KEY_3="AAAAC3NzaC1lZDI1NTE5AAAAINo70G6YRs4Vp4Bn1sQYYODExPucjkRtfcTdZSiD+jN0"  # github-actions-cv360

# Count authorised keys — include forced-command lines (command="..." ssh-ed25519 ...)
SSH_KEY_COUNT=$(grep -cE '(ssh-rsa|ssh-ed25519|ecdsa-sha2)' ~/.ssh/authorized_keys 2>/dev/null || echo "?")
SSH_KEY_ALERT=0
SSH_KEY_STATUS="✓ OK — ${SSH_KEY_COUNT} trusted keys"
SSH_KEY_COLOR="#16a34a"
if [ "$SSH_KEY_COUNT" -gt 5 ] 2>/dev/null; then
  SSH_KEY_ALERT=1
  SSH_KEY_STATUS="🟠 WARNING — unusually high number of SSH keys (${SSH_KEY_COUNT})"
  SSH_KEY_COLOR="#f59e0b"
fi

# Check all known good keys are still present
if ! grep -q "$KNOWN_KEY_1" ~/.ssh/authorized_keys 2>/dev/null; then
  SSH_KEY_ALERT=1
  SSH_KEY_STATUS="🔴 ALERT — clifford@hetzner key missing!"
  SSH_KEY_COLOR="#dc2626"
fi

# List all current SSH keys — extract comment (last field) and key type, works with forced-command prefix
SSH_KEYS_LIST=$(awk 'NF >= 3 {print $NF " (" $(NF-1) ")"}' ~/.ssh/authorized_keys 2>/dev/null || echo "unreadable")

# Check for suspicious processes (optionally enforce by killing)
# Matches: miners, reverse shells, and random-name bash processes (e.g. "bash CE4A7D")
# Excludes processes owned by 'deploy' (PM2, Next.js, health-check itself)
# NOTE: Auto-killing can cause collateral damage (e.g. killing curl/Node/PM2) if the pattern matches
# something legitimate. For safety, enforcement is OFF by default.
# Set `SECURITY_ENFORCE=1` (in `.env.local` or the cron environment) to enable auto-kill.
SECURITY_ENFORCE="${SECURITY_ENFORCE:-0}"
SUSPICIOUS_PROCS=$(ps aux 2>/dev/null \
  | grep -E 'xmrig|minerd|kdevtmpfsi|wget.*pastebin|curl.*pastebin|bash -i |bash [A-Za-z0-9]{6}$' \
  | grep -v grep || echo "")
# Also catch anything running from /tmp or /var/tmp
TMP_PROCS=$(ls /proc/*/cwd 2>/dev/null \
  | xargs -I{} sh -c 'target=$(readlink {} 2>/dev/null); pid=$(echo {} | grep -oE "[0-9]+"); echo "$target $pid"' 2>/dev/null \
  | grep -E "^/tmp|^/var/tmp|^/dev/shm" || echo "")
SUSPICIOUS_ALERT=0
SUSPICIOUS_STATUS="✓ None detected"
SUSPICIOUS_COLOR="#16a34a"
if [ -n "$SUSPICIOUS_PROCS" ] || [ -n "$TMP_PROCS" ]; then
  SUSPICIOUS_ALERT=1
  DETAIL=""
  [ -n "$SUSPICIOUS_PROCS" ] && DETAIL="Suspicious process: ${SUSPICIOUS_PROCS}"
  [ -n "$TMP_PROCS" ] && DETAIL="${DETAIL} | Running from /tmp: ${TMP_PROCS}"
  if [ "$SECURITY_ENFORCE" = "1" ]; then
    SUSPICIOUS_STATUS="🔴 MINER/BACKDOOR DETECTED — auto-killing (SECURITY_ENFORCE=1) | ${DETAIL}"
    SUSPICIOUS_COLOR="#dc2626"
    [ -n "$SUSPICIOUS_PROCS" ] && echo "$SUSPICIOUS_PROCS" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
  else
    SUSPICIOUS_STATUS="🔴 MINER/BACKDOOR DETECTED — ${DETAIL}"
    SUSPICIOUS_COLOR="#dc2626"
  fi
fi

# Crontab integrity — count lines and flag unexpected entries
CRON_LINES=$(crontab -l 2>/dev/null | grep -v '^#' | grep -v '^$' || echo "")
CRON_COUNT=$(echo "$CRON_LINES" | grep -c . 2>/dev/null || echo "0")
CRON_ALERT=0
CRON_STATUS="✓ OK — ${CRON_COUNT} jobs"
CRON_COLOR="#16a34a"
# Flag if anything other than known-good cron jobs appears
if echo "$CRON_LINES" | grep -qvE 'health-check\.sh|cron/drip|cron/affiliate'; then
  CRON_ALERT=1
  CRON_STATUS="🔴 ALERT — unexpected cron entry!"
  CRON_COLOR="#dc2626"
fi

# Current crontab as escaped text — redact secrets, then HTML-escape
CRON_DISPLAY=$(crontab -l 2>/dev/null | grep -v '^#' | grep -v '^$' \
  | python3 -c "
import sys, re
out = []
for line in sys.stdin:
    line = re.sub(r\"x-cron-secret: '([^']+)'\", \"x-cron-secret: '[redacted]'\", line)
    line = re.sub(r'RESEND_API_KEY=\S+', 'RESEND_API_KEY=[redacted]', line)
    line = re.sub(r'ADMIN_METRICS_SECRET=\S+', 'ADMIN_METRICS_SECRET=[redacted]', line)
    line = re.sub(r'CRON_SECRET=\S+', 'CRON_SECRET=[redacted]', line)
    line = line.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
    out.append(line.rstrip())
print('\n'.join(out))
" 2>/dev/null || echo "empty")

# Recent SSH logins (last 10)
RECENT_LOGINS=$(last -n 10 2>/dev/null | grep -v 'wtmp\|reboot' \
  | awk '{print $1, $3, $4" "$5" "$6" "$7, $NF}' || echo "unavailable")

# Failed SSH attempts in last 24h
FAILED_SSH=$(grep "Failed password\|Invalid user\|authentication failure" \
  /var/log/auth.log 2>/dev/null \
  | grep "$(date '+%b %e')" | wc -l 2>/dev/null || echo "?")

# Unique IPs with failed attempts today
FAILED_IPS=$(grep "Failed password\|Invalid user" /var/log/auth.log 2>/dev/null \
  | grep "$(date '+%b %e')" \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | sort -u | head -5 || echo "none")

# Recent logins as HTML rows (flag non-Lagos IPs)
# Known-good SSH source prefixes: your Nigerian IPs + GitHub Actions Azure ranges
# GitHub Actions uses 4.148.x, 20.x, 140.82.x, 143.55.x, 145.132.x
# Your Nigerian IPs: 197.210.x
RECENT_LOGINS_ROWS=$(last -n 5 2>/dev/null | grep -v 'wtmp\|reboot\|^$' | head -5 | python3 -c "
import sys
KNOWN_PREFIXES = ('197.210.', '197.211.', '102.89.', '102.90.', '102.91.', '102.92.', '4.148.', '20.', '140.82.', '143.55.', '145.132.', '172.', '48.217.', '64.236.')
rows = ''
for i, line in enumerate(sys.stdin):
  parts = line.split()
  if len(parts) < 5:
    continue
  user = parts[0]
  ip = parts[2] if len(parts) > 2 else '?'
  date = ' '.join(parts[3:7]) if len(parts) > 6 else '?'
  duration = parts[-1] if 'still' not in line else 'active'
  bg = '#f9fafb' if i % 2 == 0 else '#ffffff'
  is_known = ip == '?' or not '.' in ip or any(ip.startswith(p) for p in KNOWN_PREFIXES)
  ip_color = '#374151' if is_known else '#dc2626'
  flag = ' 🚨' if not is_known else ''
  rows += f\"<tr style='background:{bg}'><td style='padding:6px 10px;font-size:12px;color:#374151'>{user}</td><td style='padding:6px 10px;font-size:12px;color:{ip_color};font-weight:600'>{ip}{flag}</td><td style='padding:6px 10px;font-size:12px;color:#6b7280'>{date}</td><td style='padding:6px 10px;font-size:12px;color:#6b7280;text-align:right'>{duration}</td></tr>\"
print(rows if rows else '<tr><td colspan=4 style=\"padding:6px 10px;color:#9ca3af\">No data</td></tr>')
" 2>/dev/null || echo "<tr><td colspan=4>?</td></tr>")

# /tmp suspicious files — only actual files (not dirs), skip system-owned hidden dirs
TMP_SUSPICIOUS=$(find /tmp -maxdepth 1 -type f \( -name '*.sh' -o -name '*.elf' -o -name '*.py' -o -name '*.bin' \) \
  2>/dev/null | grep -v '^\s*$' || echo "")
TMP_ALERT=0
TMP_STATUS="✓ Clean"
TMP_COLOR="#16a34a"
if [ -n "$TMP_SUSPICIOUS" ]; then
  TMP_ALERT=1
  TMP_STATUS="🔴 Suspicious files in /tmp"
  TMP_COLOR="#dc2626"
fi

# FIX 5: Alert flags — check thresholds
HIGH_MEMORY=0
LOW_DISK=0
PROCESS_DOWN=0

# Memory alert
if [ "$VPS_MEM_PCT" != "?" ]; then
  VPS_MEM_PCT_INT=$(echo "$VPS_MEM_PCT" | cut -d. -f1)
  if [[ "$VPS_MEM_PCT_INT" =~ ^[0-9]+$ ]] && [ "$VPS_MEM_PCT_INT" -gt 85 ]; then
    HIGH_MEMORY=1
  fi
fi

# Disk alert
if [ "$VPS_DISK_PCT" != "?" ]; then
  VPS_DISK_PCT_INT=$(echo "$VPS_DISK_PCT" | cut -d. -f1)
  if [[ "$VPS_DISK_PCT_INT" =~ ^[0-9]+$ ]] && [ "$VPS_DISK_PCT_INT" -gt 80 ]; then
    LOW_DISK=1
  fi
fi

# PM2 process down
PROCESS_DOWN=$(python3 -c "
import json
try:
  d = json.load(open('/tmp/lp_vps.json'))
  procs = d.get('pm2_processes', [])
  print(1 if any(p.get('status') != 'online' for p in procs) else 0)
except:
  print(0)
" 2>/dev/null || echo "0")

# ── 5. Build subject with alert flags (FIX 5) ─────────────────────────────────
SUBJECT_ALERTS=""
[ "$PROCESS_DOWN" = "1" ]   && SUBJECT_ALERTS="🔴 PROCESS DOWN · ${SUBJECT_ALERTS}"
[ "$SSH_KEY_ALERT" = "1" ]  && SUBJECT_ALERTS="🔴 SSH KEY ALERT · ${SUBJECT_ALERTS}"
[ "$SUSPICIOUS_ALERT" = "1" ] && SUBJECT_ALERTS="🔴 SUSPICIOUS PROCESS · ${SUBJECT_ALERTS}"
[ "$CRON_ALERT" = "1" ]     && SUBJECT_ALERTS="🔴 CRON TAMPERED · ${SUBJECT_ALERTS}"
[ "$TMP_ALERT" = "1" ]      && SUBJECT_ALERTS="⚠️ /tmp FILES · ${SUBJECT_ALERTS}"
[ "$HIGH_MEMORY" = "1" ]    && SUBJECT_ALERTS="${SUBJECT_ALERTS}⚠️ HIGH MEMORY · "
[ "$LOW_DISK" = "1" ]       && SUBJECT_ALERTS="${SUBJECT_ALERTS}⚠️ LOW DISK · "
[ "$SSL_ALERT" = "1" ]      && SUBJECT_ALERTS="${SUBJECT_ALERTS}⚠️ SSL EXPIRING · "

if [ "$APP_STATUS" = "DOWN" ]; then
  SUBJECT="🚨 Site is DOWN — ${DATE_LABEL}"
elif [ -n "$SUBJECT_ALERTS" ]; then
  SUBJECT="${SUBJECT_ALERTS}Daily Report · ${DATE_LABEL}"
else
  REV_INT=$(echo "$REV_MONTH" | cut -d. -f1)
  [[ "$REV_INT" =~ ^[0-9]+$ ]] || REV_INT=0
  SUBJECT="📊 Daily Report · ${DATE_LABEL} · ₦${REV_INT} this month"
fi

# ── 6. Fix guide (only shown if app is down) ───────────────────────────────────
FIX_SECTION=""
if [ "$APP_STATUS" = "DOWN" ] || [ "$APP_STATUS" = "WARNING" ]; then
  FIX_SECTION="<div style='margin-top:24px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px'>
    <p style='margin:0 0 8px;font-weight:700;color:#dc2626;font-size:14px'>Action required — fix guide</p>
    <pre style='margin:0;font-size:12px;color:#374151;white-space:pre-wrap;font-family:monospace'>ssh deploy@89.167.93.25
pm2 list
pm2 logs liveportfolio --lines 30
pm2 restart liveportfolio
# If still down:
sudo systemctl restart caddy
df -h &amp;&amp; free -h</pre>
  </div>"
fi

# ── 7. Plain text fallback ─────────────────────────────────────────────────────
PLAIN_TEXT="liveportfolio.site — Daily Dashboard
${DATE_LABEL} | ${TIMESTAMP}

APP STATUS: ${APP_STATUS_LABEL}
Response: ${RESPONSE_MS}ms | SSL: ${SSL_INFO}

=== USERS ===
Total: ${USERS_TOTAL} | Today: ${USERS_TODAY} | 7d: ${USERS_7D} | 30d: ${USERS_30D}

=== REVENUE (NGN) ===
All time: ₦${REV_TOTAL} (${REV_PAYMENTS} payments)
This month: ₦${REV_MONTH} (${REV_MO_COUNT} payments)

=== SUBSCRIPTIONS ===
Active Basic: ${SUB_BASIC} | Active Pro: ${SUB_PRO}
Cancelled this month: ${SUB_CANCEL} | Expiring in 30d: ${SUB_EXPIRE}

=== PUBLISHED ===
Total paid: ${PUB_TOTAL} | Last 7d: ${PUB_7D} | Conversion: ${CONV_RATE}%

=== EMAIL LIST ===
Total: ${SUBS_TOTAL} | Today: ${SUBS_TODAY} | 7d: ${SUBS_7D}

=== PORTFOLIOS ===
Total: ${PORT_TOTAL} | Views: ${PORT_VIEWS} | Avg health: ${PORT_HEALTH}/100
Minimal: ${TPL_MINIMAL} | Bold: ${TPL_BOLD}
Top this week: ${TOP_WEEK_NAME} (${TOP_WEEK_VIEWS} views)

=== ANALYTICS ===
Unique visitors (30d): ${UNIQUE_VISITORS}
Career scores this month: ${CAREER_SCORES}
Free unpublished users: ${FREE_UNPUB}

=== VPS HEALTH ===
Uptime: ${VPS_UPTIME_HR} | Load: ${VPS_LOAD}
Memory: ${VPS_MEM_USED}MB / ${VPS_MEM_TOT}MB (${VPS_MEM_PCT}%)
Disk: ${VPS_DISK_USED}GB / ${VPS_DISK_TOT}GB (${VPS_DISK_PCT}%)

Target: ${GOAL_LABEL}/mo
Progress this month: ${REV_MO_COUNT} payments | ₦${REV_MONTH}/${GOAL_LABEL} (${PROGRESS_PCT}%)

=== SECURITY ===
SSH keys: ${SSH_KEY_STATUS}
Suspicious processes: ${SUSPICIOUS_STATUS}
Cron integrity: ${CRON_STATUS}
/tmp files: ${TMP_STATUS}
Failed SSH attempts today: ${FAILED_SSH}
Attacking IPs today: ${FAILED_IPS}

=== CRONTAB ===
${CRON_DISPLAY}"

# ── 8. Build HTML ─────────────────────────────────────────────────────────────
# FIX 1: Monthly goal in NGN — ₦500,000
# Monthly goal scales with traction — update GOAL as you hit each tier
# Tier 1: ₦50,000  (~5 payments)   — getting started
# Tier 2: ₦150,000 (~15 payments)  — early traction
# Tier 3: ₦500,000 (~50 payments)  — growth stage
GOAL=500000
GOAL_LABEL="₦500,000"
REV_MONTH_INT=$(echo "$REV_MONTH" | cut -d. -f1)
[[ "$REV_MONTH_INT" =~ ^[0-9]+$ ]] || REV_MONTH_INT=0
PROGRESS_PCT=$(( REV_MONTH_INT * 100 / GOAL ))
[ "$PROGRESS_PCT" -gt 100 ] && PROGRESS_PCT=100
# Red early, blue past 30%, green at 100%
PROGRESS_COLOR="#dc2626"
[ "$PROGRESS_PCT" -ge 30 ]  && PROGRESS_COLOR="#0A66C2"
[ "$PROGRESS_PCT" -ge 100 ] && PROGRESS_COLOR="#16a34a"

# Format revenue with commas
REV_MONTH_FMT=$(python3 -c "
try:
  v = float('$REV_MONTH')
  print('₦{:,.2f}'.format(v))
except:
  print('₦$REV_MONTH')
" 2>/dev/null || echo "₦${REV_MONTH}")

REV_TOTAL_FMT=$(python3 -c "
try:
  v = float('$REV_TOTAL')
  print('₦{:,.2f}'.format(v))
except:
  print('₦$REV_TOTAL')
" 2>/dev/null || echo "₦${REV_TOTAL}")

# VPS memory/disk colour coding
MEM_COLOR="#16a34a"
[ "$HIGH_MEMORY" = "1" ] && MEM_COLOR="#dc2626"
DISK_COLOR="#16a34a"
[ "$LOW_DISK" = "1" ] && DISK_COLOR="#dc2626"

HTML_BODY="<!DOCTYPE html>
<html>
<head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f3f4f6'>
<tr><td align='center' style='padding:24px 16px'>
<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;width:100%'>

  <!-- Header -->
  <tr>
    <td style='background:#0A66C2;border-radius:12px 12px 0 0;padding:20px 24px'>
      <table width='100%' cellpadding='0' cellspacing='0' border='0'>
        <tr>
          <td width='44' valign='middle'>
            <table cellpadding='0' cellspacing='0' border='0'>
              <tr><td style='width:36px;height:36px;background:white;border-radius:8px;text-align:center;vertical-align:middle;font-weight:800;font-size:14px;color:#0A66C2'>LP</td></tr>
            </table>
          </td>
          <td valign='middle' style='padding-left:12px'>
            <div style='color:white;font-weight:700;font-size:16px;font-family:Arial,sans-serif'>liveportfolio.site</div>
            <div style='color:#bfdbfe;font-size:12px;font-family:Arial,sans-serif'>${DATE_LABEL} · ${TIMESTAMP}</div>
          </td>
          <td align='right' valign='middle'>
            <span style='background:${APP_STATUS_COLOR};color:white;font-weight:700;font-size:12px;padding:5px 12px;border-radius:12px;font-family:Arial,sans-serif'>${APP_STATUS_LABEL}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style='background:white;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none'>

      <!-- Health stats -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px'>
        <tr>
          <td width='33%' style='padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif'>Response</div>
            <div style='font-size:18px;font-weight:700;color:#111827;font-family:Arial,sans-serif'>${RESPONSE_MS}ms</div>
          </td>
          <td width='4' style='background:white'></td>
          <td width='33%' style='padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif'>SSL</div>
            <div style='font-size:14px;font-weight:700;color:#111827;font-family:Arial,sans-serif'>${DAYS_LEFT}d left</div>
          </td>
          <td width='4' style='background:white'></td>
          <td width='33%' style='padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif'>HTTP</div>
            <div style='font-size:18px;font-weight:700;color:#111827;font-family:Arial,sans-serif'>${HTTP_CODE}</div>
          </td>
        </tr>
      </table>

      <!-- Monthly goal — FIX 1: NGN ₦500,000 -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px'>
        <tr>
          <td style='padding:14px'>
            <table width='100%' cellpadding='0' cellspacing='0' border='0'>
              <tr>
                <td style='font-size:13px;font-weight:700;color:#1e40af;font-family:Arial,sans-serif'>Monthly goal — ${GOAL_LABEL}</td>
                <td align='right' style='font-size:13px;font-weight:700;color:${PROGRESS_COLOR};font-family:Arial,sans-serif'>${REV_MONTH_FMT} / ${GOAL_LABEL} (${PROGRESS_PCT}%)</td>
              </tr>
            </table>
            <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-top:8px;background:#dbeafe;border-radius:4px;height:8px'>
              <tr><td width='${PROGRESS_PCT}%' style='background:${PROGRESS_COLOR};height:8px;border-radius:4px;font-size:0;min-width:4px'>&nbsp;</td><td></td></tr>
            </table>
            <div style='margin-top:6px;font-size:11px;color:#6b7280;font-family:Arial,sans-serif'>${REV_MO_COUNT} payments this month · target: 16 payments</div>
          </td>
        </tr>
      </table>

      <!-- Metrics grid row 1 -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:8px'>
        <tr>
          <td width='49%' style='padding:14px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:6px'>Signups</div>
            <div style='font-size:28px;font-weight:800;color:#111827;font-family:Arial,sans-serif;line-height:1'>${USERS_TOTAL}</div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:4px'>+${USERS_TODAY} today · +${USERS_7D} week · +${USERS_30D} month</div>
          </td>
          <td width='2%'></td>
          <td width='49%' style='padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#f0fdf4;vertical-align:top'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:6px'>Revenue (NGN)</div>
            <div style='font-size:22px;font-weight:800;color:#16a34a;font-family:Arial,sans-serif;line-height:1'>${REV_TOTAL_FMT}</div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:4px'>${REV_PAYMENTS} payments · ${REV_MONTH_FMT} this month</div>
          </td>
        </tr>
      </table>

      <!-- Metrics grid row 2 -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:8px'>
        <tr>
          <td width='49%' style='padding:14px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:6px'>Published</div>
            <div style='font-size:28px;font-weight:800;color:#111827;font-family:Arial,sans-serif;line-height:1'>${PUB_TOTAL}</div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:4px'>${CONV_RATE}% conversion · +${PUB_7D} this week</div>
          </td>
          <td width='2%'></td>
          <td width='49%' style='padding:14px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:6px'>Email list</div>
            <div style='font-size:28px;font-weight:800;color:#111827;font-family:Arial,sans-serif;line-height:1'>${SUBS_TOTAL}</div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:4px'>+${SUBS_TODAY} today · +${SUBS_7D} this week</div>
          </td>
        </tr>
      </table>

      <!-- Metrics grid row 3 -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px'>
        <tr>
          <td width='49%' style='padding:14px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:6px'>Portfolio views</div>
            <div style='font-size:28px;font-weight:800;color:#111827;font-family:Arial,sans-serif;line-height:1'>${PORT_VIEWS}</div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:4px'>across ${PORT_TOTAL} portfolios · ${UNIQUE_VISITORS} unique (30d)</div>
          </td>
          <td width='2%'></td>
          <td width='49%' style='padding:14px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:6px'>Avg health score</div>
            <div style='font-size:28px;font-weight:800;color:#111827;font-family:Arial,sans-serif;line-height:1'>${PORT_HEALTH}<span style='font-size:14px;color:#6b7280'>/100</span></div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:4px'>Minimal: ${TPL_MINIMAL} · Bold: ${TPL_BOLD}</div>
          </td>
        </tr>
      </table>

      <!-- FIX 3: Subscription health -->
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;font-family:Arial,sans-serif'>Subscriptions</div>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px'>
        <tr>
          <td style='padding:12px 14px'>
            <table width='100%' cellpadding='0' cellspacing='0' border='0'>
              <tr>
                <td style='font-size:12px;color:#374151;font-family:Arial,sans-serif'>
                  <strong style='color:#16a34a'>${SUB_BASIC}</strong> Basic active &nbsp;·&nbsp;
                  <strong style='color:#16a34a'>${SUB_PRO}</strong> Pro active
                </td>
                <td align='right' style='font-size:12px;color:#6b7280;font-family:Arial,sans-serif'>
                  <span style='color:#dc2626'>${SUB_CANCEL}</span> cancelled this month &nbsp;·&nbsp;
                  <span style='color:#d97706'>${SUB_EXPIRE}</span> expiring in 30d
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- FIX 6: Free unpublished users -->
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;font-family:Arial,sans-serif'>Free users — not published yet (${FREE_UNPUB} total)</div>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;border:1px solid #fed7aa;border-radius:8px'>
        <tr style='background:#fff7ed'>
          <th style='padding:7px 12px;font-size:10px;color:#9a3412;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Email</th>
          <th style='padding:7px 12px;font-size:10px;color:#9a3412;text-align:right;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Signed up</th>
        </tr>
        ${FREE_UNPUB_ROWS}
      </table>

      <!-- FIX 6: This week top portfolio -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px'>
        <tr>
          <td style='padding:12px 14px'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:4px'>Top portfolio this week</div>
            <div style='font-size:15px;font-weight:700;color:#111827;font-family:Arial,sans-serif'>${TOP_WEEK_NAME} <span style='font-size:12px;color:#6b7280;font-weight:400'>${TOP_WEEK_VIEWS} views this week</span></div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:4px'>Career scores generated this month: ${CAREER_SCORES}</div>
          </td>
        </tr>
      </table>

      <!-- Top viewed (all time) -->
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;font-family:Arial,sans-serif'>Top viewed portfolios (all time)</div>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px'>
        <tr style='background:#f9fafb'>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Name</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Views</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Template</th>
        </tr>
        ${TOP_VIEWED_ROWS}
      </table>

      <!-- Recent signups — capped at 5, full list in dashboard -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:6px'>
        <tr>
          <td style='font-size:13px;font-weight:700;color:#111827;font-family:Arial,sans-serif'>Recent signups</td>
          <td align='right' style='font-size:11px;font-family:Arial,sans-serif'><a href='${APP_URL}/dashboard' style='color:#0A66C2;text-decoration:none'>View all ${USERS_TOTAL} →</a></td>
        </tr>
      </table>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px'>
        <tr style='background:#f9fafb'>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Email</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Slug</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Plan</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Joined</th>
        </tr>
        ${RECENT_SIGNUPS_ROWS}
      </table>

      <!-- Full signup list — always visible (email clients strip details/summary) -->
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;font-family:Arial,sans-serif'>All ${USERS_TOTAL} users</div>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px'>
        <tr style='background:#f9fafb'>
          <th style='padding:6px 10px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Email</th>
          <th style='padding:6px 10px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Slug</th>
          <th style='padding:6px 10px;font-size:10px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Plan</th>
          <th style='padding:6px 10px;font-size:10px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Joined</th>
        </tr>
        ${ALL_SIGNUPS_ROWS}
      </table>

      <!-- Recent payments — FIX 1: ₦ -->
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;font-family:Arial,sans-serif'>Recent payments</div>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px'>
        <tr style='background:#f9fafb'>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Amount (NGN)</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Plan</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Date</th>
        </tr>
        ${RECENT_PAYMENTS_ROWS}
      </table>

      <!-- FIX 5: VPS Health section -->
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;font-family:Arial,sans-serif'>VPS Health</div>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px'>
        <tr>
          <td style='padding:12px 14px'>
            <table width='100%' cellpadding='0' cellspacing='0' border='0'>
              <tr>
                <td width='25%' style='text-align:center;padding:6px'>
                  <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif'>Uptime</div>
                  <div style='font-size:15px;font-weight:700;color:#111827;font-family:Arial,sans-serif'>${VPS_UPTIME_HR}</div>
                </td>
                <td width='25%' style='text-align:center;padding:6px'>
                  <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif'>Memory</div>
                  <div style='font-size:13px;font-weight:700;color:${MEM_COLOR};font-family:Arial,sans-serif'>${VPS_MEM_USED}MB / ${VPS_MEM_TOT}MB</div>
                  <div style='font-size:11px;color:${MEM_COLOR};font-family:Arial,sans-serif'>${VPS_MEM_PCT}%</div>
                </td>
                <td width='25%' style='text-align:center;padding:6px'>
                  <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif'>Disk</div>
                  <div style='font-size:13px;font-weight:700;color:${DISK_COLOR};font-family:Arial,sans-serif'>${VPS_DISK_USED}GB / ${VPS_DISK_TOT}GB</div>
                  <div style='font-size:11px;color:${DISK_COLOR};font-family:Arial,sans-serif'>${VPS_DISK_PCT}%</div>
                </td>
                <td width='25%' style='text-align:center;padding:6px'>
                  <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif'>Load (1m)</div>
                  <div style='font-size:15px;font-weight:700;color:#111827;font-family:Arial,sans-serif'>${VPS_LOAD}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- PM2 processes -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px'>
        <tr style='background:#f9fafb'>
          <th style='padding:7px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Process</th>
          <th style='padding:7px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Status</th>
          <th style='padding:7px 12px;font-size:10px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Restarts</th>
          <th style='padding:7px 12px;font-size:10px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Uptime</th>
          <th style='padding:7px 12px;font-size:10px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Memory</th>
        </tr>
        ${PM2_ROWS}
      </table>

      <!-- Security audit section -->
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;font-family:Arial,sans-serif'>Security Audit</div>

      <!-- Security status row -->
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:12px'>
        <tr>
          <td width='49%' style='padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top;background:#f9fafb'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:4px'>SSH Keys</div>
            <div style='font-size:13px;font-weight:700;color:${SSH_KEY_COLOR};font-family:Arial,sans-serif'>${SSH_KEY_STATUS}</div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:3px'>${SSH_KEYS_LIST}</div>
          </td>
          <td width='2%'></td>
          <td width='49%' style='padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top;background:#f9fafb'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:4px'>Suspicious Processes</div>
            <div style='font-size:13px;font-weight:700;color:${SUSPICIOUS_COLOR};font-family:Arial,sans-serif'>${SUSPICIOUS_STATUS}</div>
          </td>
        </tr>
      </table>

      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:12px'>
        <tr>
          <td width='49%' style='padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top;background:#f9fafb'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:4px'>Cron Integrity</div>
            <div style='font-size:13px;font-weight:700;color:${CRON_COLOR};font-family:Arial,sans-serif'>${CRON_STATUS}</div>
            <pre style='margin:4px 0 0;font-size:10px;color:#6b7280;white-space:pre-wrap;font-family:monospace'>${CRON_DISPLAY}</pre>
          </td>
          <td width='2%'></td>
          <td width='49%' style='padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top;background:#f9fafb'>
            <div style='font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:4px'>Failed SSH Today</div>
            <div style='font-size:22px;font-weight:800;color:#111827;font-family:Arial,sans-serif'>${FAILED_SSH}</div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:3px'>/tmp: ${TMP_STATUS}</div>
            <div style='font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:2px'>Top IPs: ${FAILED_IPS}</div>
          </td>
        </tr>
      </table>

      <!-- Recent logins — last 5 only -->
      <div style='font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;font-family:Arial,sans-serif'>Recent SSH logins — last 5 <span style='font-weight:400;color:#9ca3af'>(🚨 = unfamiliar IP)</span></div>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px'>
        <tr style='background:#f9fafb'>
          <th style='padding:6px 10px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>User</th>
          <th style='padding:6px 10px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>IP</th>
          <th style='padding:6px 10px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>When</th>
          <th style='padding:6px 10px;font-size:10px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Duration</th>
        </tr>
        ${RECENT_LOGINS_ROWS}
      </table>

      ${FIX_SECTION}

      <!-- Footer -->
      <div style='padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;font-family:Arial,sans-serif'>
        Sent daily at 7:00 AM Lagos time &nbsp;·&nbsp;
        <a href='${APP_URL}' style='color:#0A66C2;text-decoration:none'>liveportfolio.site</a> &nbsp;·&nbsp;
        <a href='${APP_URL}/dashboard' style='color:#0A66C2;text-decoration:none'>Dashboard</a>
      </div>

    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>"

# ── 9. Send via Resend ────────────────────────────────────────────────────────
echo "$HTML_BODY"        > /tmp/lp_html.txt
echo "$PLAIN_TEXT"       > /tmp/lp_plain.txt
echo "$SUBJECT"          > /tmp/lp_subject.txt
echo "${CSV_FILE:-}"     > /tmp/lp_csvpath.txt

python3 << 'PYEOF'
import json, os, base64

html      = open('/tmp/lp_html.txt').read()
plain     = open('/tmp/lp_plain.txt').read()
subject   = open('/tmp/lp_subject.txt').read().strip()
csv_path  = open('/tmp/lp_csvpath.txt').read().strip()

payload = {
    "from": f"liveportfolio dashboard <{os.environ.get('FROM_EMAIL','dashboard@liveportfolio.site')}>",
    "to": [os.environ.get('ALERT_EMAIL','nwannachumaclifford@gmail.com')],
    "subject": subject,
    "html": html,
    "text": plain,
}

if csv_path and os.path.isfile(csv_path):
    with open(csv_path, 'rb') as f:
        encoded = base64.b64encode(f.read()).decode('utf-8')
    filename = os.path.basename(csv_path)
    payload["attachments"] = [{
        "filename": filename,
        "content": encoded,
    }]

with open('/tmp/lp_payload.json', 'w') as f:
    json.dump(payload, f)
PYEOF

SEND_RESULT=$(curl -4 -s -w "\n%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/lp_payload.json)

SEND_HTTP=$(echo "$SEND_RESULT" | tail -1)
SEND_BODY=$(echo "$SEND_RESULT" | head -1)

rm -f /tmp/lp_metrics.json /tmp/lp_vps.json /tmp/lp_html.txt /tmp/lp_plain.txt /tmp/lp_subject.txt /tmp/lp_csvpath.txt /tmp/lp_payload.json
[ -n "${CSV_FILE:-}" ] && rm -f "$CSV_FILE"

echo "[${TIMESTAMP}] Status:${APP_STATUS} HTTP:${HTTP_CODE} ${RESPONSE_MS}ms SSL:${SSL_INFO} Users:${USERS_TOTAL} Revenue:${REV_TOTAL_FMT} Published:${PUB_TOTAL} Subs:${SUBS_TOTAL} | Email:${SEND_HTTP} ${SEND_BODY}"
