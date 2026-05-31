#!/bin/bash
# liveportfolio.site — Daily SaaS dashboard + health check
# Sends a rich HTML email with all key metrics via Resend
# Runs daily at 6:00 AM UTC (7:00 AM Lagos time) via cron

set -euo pipefail

APP_URL="https://liveportfolio.site"
HEALTH_URL="${APP_URL}/api/health"
METRICS_URL="${APP_URL}/api/admin/metrics"
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
if [ -n "$EXPIRY" ]; then
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  SSL_INFO="${DAYS_LEFT} days remaining"
  if [ "$DAYS_LEFT" -lt 14 ]; then
    APP_STATUS="WARNING"
    APP_STATUS_COLOR="#d97706"
    APP_STATUS_LABEL="SSL expires in ${DAYS_LEFT} days!"
  fi
fi

# ── 3. Pull SaaS metrics ───────────────────────────────────────────────────────
METRICS_JSON=$(curl -s --max-time 15 \
  -H "x-metrics-secret: ${ADMIN_METRICS_SECRET:-}" \
  "$METRICS_URL" || echo "{}")

# Parse with python3 (always available on Ubuntu)
parse() {
  python3 -c "
import sys, json
try:
  d = json.loads(open('/tmp/lp_metrics.json').read())
  print(d$1)
except:
  print('?')
" 2>/dev/null || echo "?"
}

echo "$METRICS_JSON" > /tmp/lp_metrics.json

USERS_TOTAL=$(python3   -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('users',{}).get('total','?'))"   2>/dev/null || echo "?")
USERS_TODAY=$(python3   -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('users',{}).get('today','?'))"   2>/dev/null || echo "?")
USERS_7D=$(python3      -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('users',{}).get('last_7_days','?'))"  2>/dev/null || echo "?")
USERS_30D=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('users',{}).get('last_30_days','?'))" 2>/dev/null || echo "?")

REV_TOTAL=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('revenue',{}).get('total_usd','?'))"          2>/dev/null || echo "?")
REV_MONTH=$(python3     -c "import json; d=json.load(open('/tmp/lp_metrics.json')); print(d.get('revenue',{}).get('this_month_usd','?'))"      2>/dev/null || echo "?")
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
    plan_color = '#16a34a' if plan == 'pro' else '#6b7280'
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

# Recent payments as HTML rows
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
    rows += f\"<tr style='background:{bg}'><td style='padding:8px 12px;font-size:13px;color:#16a34a;font-weight:700'>\${p.get('amount_usd','?')}</td><td style='padding:8px 12px;font-size:12px;color:#374151'>{p.get('tier','?')}</td><td style='padding:8px 12px;font-size:12px;color:#6b7280;text-align:right'>{date}</td></tr>\"
  print(rows)
except:
  print('<tr><td colspan=3 style=\"padding:8px 12px;color:#9ca3af\">No data</td></tr>')
" 2>/dev/null || echo "<tr><td colspan=3>?</td></tr>")

# ── 4. Fix guide (only shown if app is down) ───────────────────────────────────
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

# ── 5. Plain text fallback ─────────────────────────────────────────────────────
PLAIN_TEXT="liveportfolio.site — Daily Dashboard
${DATE_LABEL} | ${TIMESTAMP}

APP STATUS: ${APP_STATUS_LABEL}
Response: ${RESPONSE_MS}ms | SSL: ${SSL_INFO}

=== USERS ===
Total: ${USERS_TOTAL} | Today: ${USERS_TODAY} | 7d: ${USERS_7D} | 30d: ${USERS_30D}

=== REVENUE ===
All time: \$${REV_TOTAL} (${REV_PAYMENTS} payments)
This month: \$${REV_MONTH} (${REV_MO_COUNT} payments)

=== PUBLISHED ===
Total paid: ${PUB_TOTAL} | Last 7d: ${PUB_7D} | Conversion: ${CONV_RATE}%

=== EMAIL LIST ===
Total: ${SUBS_TOTAL} | Today: ${SUBS_TODAY} | 7d: ${SUBS_7D}

=== PORTFOLIOS ===
Total: ${PORT_TOTAL} | Views: ${PORT_VIEWS} | Avg health: ${PORT_HEALTH}/100
Minimal: ${TPL_MINIMAL} | Bold: ${TPL_BOLD}

Target: \$300/mo = 16 payments/mo
Progress this month: ${REV_MO_COUNT}/16 payments | \$${REV_MONTH}/\$300"

# ── 6. Build email subject ────────────────────────────────────────────────────
if [ "$APP_STATUS" = "DOWN" ]; then
  SUBJECT="🚨 ALERT — liveportfolio.site is DOWN | ${DATE_LABEL}"
elif [ "$APP_STATUS" = "WARNING" ]; then
  SUBJECT="⚠️ WARNING — liveportfolio.site | SSL expiring | ${DATE_LABEL}"
else
  SUBJECT="📊 liveportfolio.site — Daily Dashboard | \$${REV_MONTH} this month | ${DATE_LABEL}"
fi

# ── 7. Build HTML ─────────────────────────────────────────────────────────────
# Progress toward $300/mo goal
GOAL=300
REV_MONTH_INT=$(echo "$REV_MONTH" | cut -d. -f1)
[[ "$REV_MONTH_INT" =~ ^[0-9]+$ ]] || REV_MONTH_INT=0
PROGRESS_PCT=$(( REV_MONTH_INT * 100 / GOAL ))
[ "$PROGRESS_PCT" -gt 100 ] && PROGRESS_PCT=100
PROGRESS_COLOR="#0A66C2"
[ "$PROGRESS_PCT" -ge 100 ] && PROGRESS_COLOR="#16a34a"
[ "$PROGRESS_PCT" -lt 30 ] && PROGRESS_COLOR="#dc2626"

HTML_BODY="<!DOCTYPE html>
<html>
<head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,sans-serif'>
<div style='max-width:600px;margin:0 auto;padding:24px 16px'>

  <!-- Header -->
  <div style='background:#0A66C2;border-radius:12px 12px 0 0;padding:20px 24px;display:flex;align-items:center;gap:12px'>
    <div style='width:36px;height:36px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0'>
      <svg width='22' height='22' viewBox='0 0 28 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <circle cx='14' cy='11' r='4.5' fill='%230A66C2'/>
        <path d='M5 24c0-4.97 4.03-9 9-9s9 4.03 9 9' stroke='%230A66C2' stroke-width='2' stroke-linecap='round'/>
      </svg>
    </div>
    <div>
      <div style='color:white;font-weight:700;font-size:16px'>liveportfolio.site</div>
      <div style='color:rgba(255,255,255,0.75);font-size:12px'>${DATE_LABEL} &nbsp;·&nbsp; ${TIMESTAMP}</div>
    </div>
    <div style='margin-left:auto;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;background:${APP_STATUS_COLOR};color:white'>
      ${APP_STATUS_LABEL}
    </div>
  </div>

  <!-- Body card -->
  <div style='background:white;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none'>

    <!-- App health row -->
    <div style='display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap'>
      <div style='flex:1;min-width:120px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;text-align:center'>
        <div style='font-size:11px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px'>Response</div>
        <div style='font-size:18px;font-weight:700;color:#111827'>${RESPONSE_MS}ms</div>
      </div>
      <div style='flex:1;min-width:120px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;text-align:center'>
        <div style='font-size:11px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px'>SSL</div>
        <div style='font-size:18px;font-weight:700;color:#111827'>${SSL_INFO}</div>
      </div>
      <div style='flex:1;min-width:120px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;text-align:center'>
        <div style='font-size:11px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px'>HTTP</div>
        <div style='font-size:18px;font-weight:700;color:#111827'>${HTTP_CODE}</div>
      </div>
    </div>

    <!-- Monthly goal bar -->
    <div style='margin-bottom:24px;padding:16px;background:#f0f7ff;border-radius:8px;border:1px solid #bfdbfe'>
      <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'>
        <span style='font-size:13px;font-weight:700;color:#1e40af'>Monthly goal — \$300</span>
        <span style='font-size:13px;font-weight:700;color:${PROGRESS_COLOR}'>\$${REV_MONTH} / \$300 &nbsp;(${PROGRESS_PCT}%)</span>
      </div>
      <div style='height:8px;background:#dbeafe;border-radius:4px;overflow:hidden'>
        <div style='height:100%;width:${PROGRESS_PCT}%;background:${PROGRESS_COLOR};border-radius:4px;transition:width .3s'></div>
      </div>
      <div style='margin-top:8px;font-size:12px;color:#6b7280'>${REV_MO_COUNT} payments this month &nbsp;·&nbsp; target: 16 payments</div>
    </div>

    <!-- Big metrics grid -->
    <div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px'>

      <!-- Users -->
      <div style='padding:16px;border:1px solid #e5e7eb;border-radius:8px'>
        <div style='font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'>👥 Signups</div>
        <div style='font-size:28px;font-weight:800;color:#111827;line-height:1'>${USERS_TOTAL}</div>
        <div style='font-size:12px;color:#6b7280;margin-top:6px'>
          +${USERS_TODAY} today &nbsp;·&nbsp; +${USERS_7D} this week &nbsp;·&nbsp; +${USERS_30D} this month
        </div>
      </div>

      <!-- Revenue -->
      <div style='padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f0fdf4'>
        <div style='font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'>💰 Revenue</div>
        <div style='font-size:28px;font-weight:800;color:#16a34a;line-height:1'>\$${REV_TOTAL}</div>
        <div style='font-size:12px;color:#6b7280;margin-top:6px'>
          ${REV_PAYMENTS} payments &nbsp;·&nbsp; \$${REV_MONTH} this month
        </div>
      </div>

      <!-- Published -->
      <div style='padding:16px;border:1px solid #e5e7eb;border-radius:8px'>
        <div style='font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'>🚀 Published</div>
        <div style='font-size:28px;font-weight:800;color:#111827;line-height:1'>${PUB_TOTAL}</div>
        <div style='font-size:12px;color:#6b7280;margin-top:6px'>
          ${CONV_RATE}% conversion &nbsp;·&nbsp; +${PUB_7D} this week
        </div>
      </div>

      <!-- Email list -->
      <div style='padding:16px;border:1px solid #e5e7eb;border-radius:8px'>
        <div style='font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'>📧 Email list</div>
        <div style='font-size:28px;font-weight:800;color:#111827;line-height:1'>${SUBS_TOTAL}</div>
        <div style='font-size:12px;color:#6b7280;margin-top:6px'>
          +${SUBS_TODAY} today &nbsp;·&nbsp; +${SUBS_7D} this week
        </div>
      </div>

      <!-- Portfolio views -->
      <div style='padding:16px;border:1px solid #e5e7eb;border-radius:8px'>
        <div style='font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'>👁 Portfolio views</div>
        <div style='font-size:28px;font-weight:800;color:#111827;line-height:1'>${PORT_VIEWS}</div>
        <div style='font-size:12px;color:#6b7280;margin-top:6px'>
          across ${PORT_TOTAL} portfolios
        </div>
      </div>

      <!-- Avg health score -->
      <div style='padding:16px;border:1px solid #e5e7eb;border-radius:8px'>
        <div style='font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'>❤️ Avg health score</div>
        <div style='font-size:28px;font-weight:800;color:#111827;line-height:1'>${PORT_HEALTH}<span style='font-size:16px;color:#6b7280'>/100</span></div>
        <div style='font-size:12px;color:#6b7280;margin-top:6px'>
          Minimal: ${TPL_MINIMAL} &nbsp;·&nbsp; Bold: ${TPL_BOLD}
        </div>
      </div>

    </div>

    <!-- Top viewed portfolios -->
    <div style='margin-bottom:24px'>
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px'>🔥 Top viewed portfolios</div>
      <table style='width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden'>
        <thead>
          <tr style='background:#f9fafb'>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Name</th>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Views</th>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Template</th>
          </tr>
        </thead>
        <tbody>${TOP_VIEWED_ROWS}</tbody>
      </table>
    </div>

    <!-- Recent signups -->
    <div style='margin-bottom:24px'>
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px'>🆕 Recent signups</div>
      <table style='width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden'>
        <thead>
          <tr style='background:#f9fafb'>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Email</th>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Slug</th>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Plan</th>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Joined</th>
          </tr>
        </thead>
        <tbody>${RECENT_SIGNUPS_ROWS}</tbody>
      </table>
    </div>

    <!-- Recent payments -->
    <div style='margin-bottom:24px'>
      <div style='font-size:13px;font-weight:700;color:#111827;margin-bottom:8px'>💳 Recent payments</div>
      <table style='width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden'>
        <thead>
          <tr style='background:#f9fafb'>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Amount</th>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Plan</th>
            <th style='padding:8px 12px;font-size:11px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:.5px'>Date</th>
          </tr>
        </thead>
        <tbody>${RECENT_PAYMENTS_ROWS}</tbody>
      </table>
    </div>

    ${FIX_SECTION}

    <!-- Footer -->
    <div style='padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center'>
      Sent daily at 7:00 AM Lagos time &nbsp;·&nbsp;
      <a href='${APP_URL}' style='color:#0A66C2;text-decoration:none'>liveportfolio.site</a> &nbsp;·&nbsp;
      <a href='${APP_URL}/dashboard' style='color:#0A66C2;text-decoration:none'>Dashboard</a>
    </div>

  </div>
</div>
</body></html>"

# ── 8. Send via Resend ────────────────────────────────────────────────────────
# Escape for JSON
HTML_ESCAPED=$(echo "$HTML_BODY" | python3 -c "
import sys, json
html = sys.stdin.read()
print(json.dumps(html))
")

PLAIN_ESCAPED=$(echo "$PLAIN_TEXT" | python3 -c "
import sys, json
print(json.dumps(sys.stdin.read()))
")

PAYLOAD=$(python3 -c "
import json
subject = json.dumps('${SUBJECT}')
print('{\"from\":\"liveportfolio dashboard <${FROM_EMAIL}>\",\"to\":[\"${ALERT_EMAIL}\"],\"subject\":' + subject + ',\"html\":' + ${HTML_ESCAPED} + ',\"text\":' + ${PLAIN_ESCAPED} + '}')
" 2>/dev/null)

# Fallback: simple payload if python3 JSON building fails
if [ -z "$PAYLOAD" ]; then
  PAYLOAD="{\"from\":\"liveportfolio dashboard <${FROM_EMAIL}>\",\"to\":[\"${ALERT_EMAIL}\"],\"subject\":\"liveportfolio daily check ${TIMESTAMP}\",\"text\":\"${PLAIN_TEXT}\"}"
fi

SEND_RESULT=$(curl -s -w "\n%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

SEND_HTTP=$(echo "$SEND_RESULT" | tail -1)
SEND_BODY=$(echo "$SEND_RESULT" | head -1)

rm -f /tmp/lp_metrics.json

echo "[${TIMESTAMP}] Status:${APP_STATUS} HTTP:${HTTP_CODE} ${RESPONSE_MS}ms SSL:${SSL_INFO} Users:${USERS_TOTAL} Revenue:\$${REV_TOTAL} Published:${PUB_TOTAL} Subs:${SUBS_TOTAL} | Email:${SEND_HTTP} ${SEND_BODY}"
