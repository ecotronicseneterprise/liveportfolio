#!/bin/bash
# VPS security check — run any time you suspect an attack
# Usage: bash /home/deploy/apps/liveportfolio/scripts/check-security.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CLEAN=1

echo ""
echo "=============================="
echo "  VPS SECURITY CHECK"
echo "  $(date)"
echo "=============================="

# 1. Known miner process names (random 6-char bash scripts)
echo ""
echo "[ 1/6 ] Checking for miner processes..."
MINER_PROCS=$(ps aux 2>/dev/null | grep -E 'xmrig|minerd|kdevtmpfsi|bash [A-Za-z0-9]{6}$' | grep -v grep)
if [ -n "$MINER_PROCS" ]; then
  echo -e "${RED}  ALERT: Suspicious process detected:${NC}"
  echo "$MINER_PROCS"
  CLEAN=0
else
  echo -e "${GREEN}  OK — no miner processes${NC}"
fi

# 2. Processes running from /tmp or /var/tmp
echo ""
echo "[ 2/6 ] Checking for processes running from /tmp..."
TMP_PROCS=$(ls /proc/*/cwd 2>/dev/null | while read link; do
  target=$(readlink "$link" 2>/dev/null)
  pid=$(echo "$link" | grep -oE '[0-9]+')
  if echo "$target" | grep -qE '^/tmp|^/var/tmp|^/dev/shm'; then
    cmd=$(ps -p "$pid" -o comm= 2>/dev/null)
    echo "  PID $pid ($cmd) → $target"
  fi
done)
if [ -n "$TMP_PROCS" ]; then
  echo -e "${RED}  ALERT: Processes running from /tmp:${NC}"
  echo "$TMP_PROCS"
  CLEAN=0
else
  echo -e "${GREEN}  OK — no processes in /tmp${NC}"
fi

# 3. Known miner artifact directories
echo ""
echo "[ 3/6 ] Checking for miner artifacts..."
ARTIFACTS=""
[ -d "/tmp/.XIN-unix" ]  && ARTIFACTS="$ARTIFACTS /tmp/.XIN-unix"
[ -f "/var/tmp/.bin" ]   && ARTIFACTS="$ARTIFACTS /var/tmp/.bin"
[ -d "/var/tmp/.bin" ]   && ARTIFACTS="$ARTIFACTS /var/tmp/.bin (dir)"
ls /tmp/.[A-Z]* 2>/dev/null | grep -v "^ls:" && ARTIFACTS="$ARTIFACTS (hidden /tmp dirs)"
if [ -n "$ARTIFACTS" ]; then
  echo -e "${RED}  ALERT: Miner artifacts found: $ARTIFACTS${NC}"
  CLEAN=0
else
  echo -e "${GREEN}  OK — no artifacts${NC}"
fi

# 4. authorized_keys integrity check
echo ""
echo "[ 4/6 ] Checking authorized_keys..."
KEY_COUNT=$(grep -c "ssh-" /home/deploy/.ssh/authorized_keys 2>/dev/null || echo 0)
KNOWN_KEYS=("clifford@hetzner" "github-actions-liveportfolio")
UNKNOWN=0
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  FOUND=0
  for k in "${KNOWN_KEYS[@]}"; do
    echo "$line" | grep -q "$k" && FOUND=1
  done
  [ $FOUND -eq 0 ] && echo -e "${RED}  ALERT: Unknown key: $line${NC}" && UNKNOWN=1 && CLEAN=0
done < /home/deploy/.ssh/authorized_keys
if [ $UNKNOWN -eq 0 ]; then
  echo -e "${GREEN}  OK — $KEY_COUNT keys, all known${NC}"
fi

# 5. Recent SSH logins — flag unknown IPs
echo ""
echo "[ 5/6 ] Recent SSH logins..."
RECENT_LOGINS=$(sudo grep "Accepted publickey" /var/log/auth.log 2>/dev/null | tail -10)
if [ -z "$RECENT_LOGINS" ]; then
  echo "  No recent logins found in auth.log"
else
  echo "$RECENT_LOGINS" | while read -r line; do
    IP=$(echo "$line" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | tail -1)
    if echo "$IP" | grep -qE '^197\.210\.|^145\.132\.|^20\.|^140\.82\.|^143\.55\.'; then
      echo -e "${GREEN}  OK: $line${NC}"
    else
      echo -e "${RED}  ALERT — unknown IP: $line${NC}"
      CLEAN=0
    fi
  done
fi

# 6. Top CPU processes
echo ""
echo "[ 6/6 ] Top CPU consumers..."
ps aux --sort=-%cpu 2>/dev/null | head -6 | tail -5 | while read -r line; do
  CPU=$(echo "$line" | awk '{print $3}')
  CMD=$(echo "$line" | awk '{print $11}')
  # Flag anything >50% CPU that isn't node/caddy/pm2/sshd
  if awk "BEGIN{exit !($CPU > 50)}" 2>/dev/null; then
    echo "$CMD" | grep -qE 'node|caddy|pm2|sshd|ps|python' || echo -e "${RED}  ALERT: High CPU ($CPU%): $line${NC}" && CLEAN=0
  else
    echo "  $CPU% — $CMD"
  fi
done

# Summary
echo ""
echo "=============================="
if [ $CLEAN -eq 1 ]; then
  echo -e "${GREEN}  ALL CLEAR — no threats detected${NC}"
else
  echo -e "${RED}  THREATS DETECTED — review alerts above${NC}"
  echo ""
  echo "  Quick cleanup commands:"
  echo "  kill -9 \$(ps aux | grep -E 'bash [A-Za-z0-9]{6}' | grep -v grep | awk '{print \$2}')"
  echo "  rm -rf /tmp/.XIN-unix /var/tmp/.bin"
fi
echo "=============================="
echo ""
