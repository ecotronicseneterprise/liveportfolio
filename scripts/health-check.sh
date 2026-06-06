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
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" || echo "000")
RESPONSE_TIME_RAW=$(curl -s -o /dev/null -w "%{time_total}" --max-time 15 "$HEALTH_URL" || echo "0")
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
METRICS_JSON=$(curl -s --max-time 15 \
  -H "x-metrics-secret: ${ADMIN_METRICS_SECRET:-}" \
  "$METRICS_URL" || echo "{}")

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
VPS_JSON=$(curl -s --max-time 10 \
  -H "x-metrics-secret: ${ADMIN_METRICS_SECRET:-}" \
  "$VPS_HEALTH_URL" || echo "{}")

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
[ "$PROCESS_DOWN" = "1" ] && SUBJECT_ALERTS="🔴 PROCESS DOWN · ${SUBJECT_ALERTS}"
[ "$HIGH_MEMORY" = "1" ]  && SUBJECT_ALERTS="${SUBJECT_ALERTS}⚠️ HIGH MEMORY · "
[ "$LOW_DISK" = "1" ]     && SUBJECT_ALERTS="${SUBJECT_ALERTS}⚠️ LOW DISK · "
[ "$SSL_ALERT" = "1" ]    && SUBJECT_ALERTS="${SUBJECT_ALERTS}⚠️ SSL EXPIRING · "

BASE_SUBJECT="LP · liveportfolio.site · ${DATE_LABEL}"

if [ "$APP_STATUS" = "DOWN" ]; then
  SUBJECT="🚨 ALERT — liveportfolio.site is DOWN · ${DATE_LABEL}"
elif [ -n "$SUBJECT_ALERTS" ]; then
  SUBJECT="${SUBJECT_ALERTS}${BASE_SUBJECT}"
else
  # FIX 1: revenue in NGN in subject
  REV_INT=$(echo "$REV_MONTH" | cut -d. -f1)
  [[ "$REV_INT" =~ ^[0-9]+$ ]] || REV_INT=0
  SUBJECT="📊 ${BASE_SUBJECT} · ₦${REV_INT} this month"
fi

# ── 6. Fix guide (only shown if app is down) ───────────────────────────────────
FIX_SECTION=""
if [ "$APP_STATUS" = "DOWN" ] || [ "$APP_STATUS" = "WARNING" ]; then
  FIX_SECTION="<div style='margin-top:24px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px'>
    <p style='margin:0 0 8px;font-weight:700;color:#dc2626;font-size:14px'>Action required — fix guide</p>
    <pre style='margin:0;font-size:12px;color:#374151;white-space:pre-wrap;font-family:monospace'>ssh deploy@46.225.186.103
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

Target: ₦500,000/mo = 16 payments/mo
Progress this month: ${REV_MO_COUNT}/16 payments | ₦${REV_MONTH}/₦500,000"

# ── 8. Build HTML ─────────────────────────────────────────────────────────────
# FIX 1: Monthly goal in NGN — ₦500,000
GOAL=500000
REV_MONTH_INT=$(echo "$REV_MONTH" | cut -d. -f1)
[[ "$REV_MONTH_INT" =~ ^[0-9]+$ ]] || REV_MONTH_INT=0
PROGRESS_PCT=$(( REV_MONTH_INT * 100 / GOAL ))
[ "$PROGRESS_PCT" -gt 100 ] && PROGRESS_PCT=100
PROGRESS_COLOR="#0A66C2"
[ "$PROGRESS_PCT" -ge 100 ] && PROGRESS_COLOR="#16a34a"
[ "$PROGRESS_PCT" -lt 30 ]  && PROGRESS_COLOR="#dc2626"

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
                <td style='font-size:13px;font-weight:700;color:#1e40af;font-family:Arial,sans-serif'>Monthly goal — ₦500,000</td>
                <td align='right' style='font-size:13px;font-weight:700;color:${PROGRESS_COLOR};font-family:Arial,sans-serif'>${REV_MONTH_FMT} / ₦500,000 (${PROGRESS_PCT}%)</td>
              </tr>
            </table>
            <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-top:8px;background:#dbeafe;border-radius:4px;height:8px'>
              <tr><td width='${PROGRESS_PCT}%' style='background:${PROGRESS_COLOR};height:8px;border-radius:4px;font-size:0'>&nbsp;</td><td></td></tr>
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

      <!-- Recent signups -->
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;font-family:Arial,sans-serif'>Recent signups</div>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px'>
        <tr style='background:#f9fafb'>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Email</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Slug</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Plan</th>
          <th style='padding:8px 12px;font-size:10px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;font-family:Arial,sans-serif'>Joined</th>
        </tr>
        ${RECENT_SIGNUPS_ROWS}
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
echo "$HTML_BODY"   > /tmp/lp_html.txt
echo "$PLAIN_TEXT"  > /tmp/lp_plain.txt
echo "$SUBJECT"     > /tmp/lp_subject.txt

python3 << 'PYEOF'
import json, os

html    = open('/tmp/lp_html.txt').read()
plain   = open('/tmp/lp_plain.txt').read()
subject = open('/tmp/lp_subject.txt').read().strip()

payload = {
    "from": f"liveportfolio dashboard <{os.environ.get('FROM_EMAIL','dashboard@liveportfolio.site')}>",
    "to": [os.environ.get('ALERT_EMAIL','nwannachumaclifford@gmail.com')],
    "subject": subject,
    "html": html,
    "text": plain,
}
with open('/tmp/lp_payload.json', 'w') as f:
    json.dump(payload, f)
PYEOF

SEND_RESULT=$(curl -s -w "\n%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/lp_payload.json)

SEND_HTTP=$(echo "$SEND_RESULT" | tail -1)
SEND_BODY=$(echo "$SEND_RESULT" | head -1)

rm -f /tmp/lp_metrics.json /tmp/lp_vps.json /tmp/lp_html.txt /tmp/lp_plain.txt /tmp/lp_subject.txt /tmp/lp_payload.json

echo "[${TIMESTAMP}] Status:${APP_STATUS} HTTP:${HTTP_CODE} ${RESPONSE_MS}ms SSL:${SSL_INFO} Users:${USERS_TOTAL} Revenue:${REV_TOTAL_FMT} Published:${PUB_TOTAL} Subs:${SUBS_TOTAL} | Email:${SEND_HTTP} ${SEND_BODY}"
