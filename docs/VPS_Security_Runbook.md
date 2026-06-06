# VPS Security Runbook — liveportfolio.site

**Server:** 46.225.186.103 (Hetzner ARM64, Ubuntu)  
**User:** deploy  
**Clean baseline captured:** Sat Jun 6 04:43 UTC 2026  

---

## Clean Baseline (Jun 6 04:43 UTC 2026)

Compare every section below against this known-good state when you suspect compromise.

### Authorized SSH Keys (EXACTLY one key must be present)

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEDgN/BvoDqFCrQS0a43rfwdd+lv8mFSFv3w4rd3IBsW
```

Any other key = active compromise. Remove immediately.

### Crontab (`crontab -l`)

```
0 6 * * * RESEND_API_KEY=... ADMIN_METRICS_SECRET=... bash /home/deploy/apps/liveportfolio/scripts/health-check.sh
0 7 * * * curl -s -H "x-cron-secret: ..." https://liveportfolio.site/api/cron/drip
```

Exactly 2 entries. Any extra line (especially `wget|sh`, `curl|bash`, `docker`, `crontab -r`) = compromise.

### PM2 Processes

```
id 0 │ liveportfolio │ fork │ next-server v15.3.3 │ port 3001 │ online
id 2 │ upjobs        │ fork │ next-server v16.2.0 │ port 3000 │ online
```

No other PM2 entries should exist.

### /dev/shm (must be empty)

```
total 0
drwxrwxrwt  2 root root   40 Jun  6 04:30 .
drwxr-xr-x 19 root root 3920 Jun  3 13:01 ..
```

Any binary file here (e.g. `duet`, random hex names, `.miner_*`) = active cryptominer.

### /tmp (must have no large or suspicious files)

```
total 44
drwxrwxrwt 11 root root 4096 Jun  6 04:43 .
drwxr-xr-x 23 root root 4096 Jun  6 01:40 ..
```

Binaries >1MB in /tmp (especially named `dashboard`, `kinsing`, `xmrig`) = compromise.

### Legitimate Processes

```
deploy   1052315  next-server (v15.3.3)        ← liveportfolio app
deploy   1793217  next-server (v16.2.0)        ← upjobs/cv360 app
deploy      5403  PM2 v7.0.1: God Daemon
root     *        sshd: deploy [priv]
deploy   *        sshd: deploy@pts/*
deploy   *        -bash
deploy   *        ps aux (or other shell commands you ran)
deploy      1212  /usr/lib/systemd/systemd --user
deploy      1213  (sd-pam)
```

### Network (active connections)

```
port 22   SSH    — only your own IPs should have ESTAB connections
port 443  HTTPS  — Cloudflare/CDN IPs normal here
```

No outbound connections to mining pools (port 3333, 4444, 14444, 45560).

### lsattr on authorized_keys (no immutable flag)

```
--------------e------- /home/deploy/.ssh/authorized_keys
```

If you see `----i---------e-------`, the file is locked by an attacker. See remediation below.

### SSH Config (`/etc/ssh/sshd_config`)

```
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
```

---

## Priority 1 — Run These First (Critical Diagnosis)

### 1. Check SSH authorized_keys

```bash
cat ~/.ssh/authorized_keys
```

**What to look for:** exactly one `ssh-ed25519` line matching the baseline above.  
Any `ssh-rsa` key or extra line = attacker has persistent SSH access.

**Fix if extra key found:**

```bash
# Check if file is locked immutable
lsattr ~/.ssh/authorized_keys

# If you see ----i---- (immutable flag set by attacker):
sudo chattr -i ~/.ssh/authorized_keys

# Now overwrite with only your legitimate key:
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEDgN/BvoDqFCrQS0a43rfwdd+lv8mFSFv3w4rd3IBsW' | sudo tee ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

### 2. Check crontab for malicious entries

```bash
crontab -l
```

**What to look for:** only the 2 entries from the baseline above.

**Red flags (immediate compromise indicators):**
- Any line containing `wget`, `curl`, `bash` piped together  
- Any line referencing `/dev/shm`, `/tmp`, `pakchoi`, `docker`
- `crontab -r` appearing anywhere

**Fix:**

```bash
crontab -e
# Delete all suspicious lines, keep only the 2 legitimate ones
```

---

### 3. Check for miners in /dev/shm

```bash
ls -la /dev/shm/
```

**Should be empty** (only `.` and `..`). Any file here is almost certainly malware.

**Fix:**

```bash
# Kill any process using the file first
lsof /dev/shm/<filename>
kill -9 <PID>

# Then delete
rm -f /dev/shm/*
```

---

### 4. Check running processes for suspicious names

```bash
ps aux --sort=-%cpu | head -30
```

**Red flags:**
- Random 6–8 character process names (e.g. `grCW23`, `kinsing`, `xmrig`)
- High CPU processes not belonging to `next-server` or `PM2`
- Processes running from `/dev/shm`, `/tmp`, or `/home/deploy/.*` hidden dirs

**Fix:**

```bash
kill -9 <suspicious_PID>
```

---

### 5. Check /tmp for large binaries

```bash
ls -lah /tmp/
```

**Red flags:** any binary file >1MB, especially named `dashboard`, `kinsing`, `xmrig`, or random hex strings.

**Fix:**

```bash
rm -f /tmp/<suspicious_file>
```

---

## Priority 2 — Full Audit (Run After Priority 1 is Clean)

### 6. Check home directory for hidden folders

```bash
ls -la ~/
ls -la ~/.ssh/
```

**Red flags:** hidden directories like `.syslog-*`, `.cache/kinsing`, `.X*`, or anything not in the baseline.

**Fix:**

```bash
rm -rf ~/.<suspicious_dir>
```

---

### 7. Check network connections for mining pool traffic

```bash
ss -tnp | grep -v '443\|22\|127'
```

**Red flags:** outbound connections on ports 3333, 4444, 5555, 14444, 45560, or connections to IPs you don't recognize.

---

### 8. Check all root crontabs

```bash
sudo crontab -l
sudo cat /etc/cron.d/*
sudo cat /etc/crontab
sudo ls /etc/cron.hourly/ /etc/cron.daily/ /etc/cron.weekly/
```

Attackers often install persistence in system crontabs as well as the user crontab.

---

### 9. Check for unauthorized systemd services

```bash
systemctl list-units --type=service --state=running | grep -v 'ssh\|cron\|system\|network\|ufw\|fail2ban\|caddy\|pm2'
```

Any unfamiliar service name = investigate with `systemctl status <name>` before killing.

---

### 10. Check SSH login history

```bash
last -n 20
lastb -n 10   # failed login attempts
```

**Red flags:** logins from IPs you don't recognize, login times you weren't active.

---

### 11. Verify PM2 processes are clean

```bash
pm2 list
pm2 logs liveportfolio --lines 30 --nostream
```

Only `liveportfolio` (port 3001) and `upjobs` (port 3000) should appear. Any other PM2 process is suspicious.

---

### 12. Check for large or recently modified files in home dir

```bash
find /home/deploy -size +10M -type f 2>/dev/null
find /home/deploy -newer /home/deploy/.ssh/authorized_keys -type f 2>/dev/null | grep -v '.pm2\|.local\|apps/liveportfolio/.next'
```

---

## Priority 3 — After Cleaning, Harden

### 13. Rotate all secrets

After any confirmed compromise, rotate every secret the VPS had access to:

| Secret | Where to rotate |
|--------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `PAYSTACK_SECRET_KEY` | dashboard.paystack.com → Settings → API |
| `RESEND_API_KEY` | resend.com → API Keys |
| `ADMIN_METRICS_SECRET` | Generate new: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CRON_SECRET` | Generate new: same as above |

Then update `/home/deploy/apps/liveportfolio/.env.local` and reload PM2:

```bash
pm2 startOrReload /home/deploy/apps/liveportfolio/ecosystem.config.js --env production --update-env
```

And update all secrets in GitHub Actions → Settings → Secrets.

---

### 14. Lock authorized_keys against future tampering

After confirming your key is the only one present:

```bash
# DO NOT use chattr -i on your own keys (makes it harder for you to rotate)
# Instead, just ensure correct permissions:
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

### 15. Check Caddy config is unmodified

```bash
cat /etc/caddy/Caddyfile | grep -A5 'liveportfolio'
```

Must contain `header_up Host {host}`. If missing, subdomain routing breaks (all portfolios 404).

---

## One-Shot Full Scan Command

Run this single command for a quick overview of the most critical indicators:

```bash
echo "=== SSH KEYS ===" && cat ~/.ssh/authorized_keys && \
echo "=== LSATTR KEYS ===" && lsattr ~/.ssh/authorized_keys && \
echo "=== CRONTAB ===" && crontab -l && \
echo "=== SHM ===" && ls -la /dev/shm/ && \
echo "=== TMP ===" && ls -lah /tmp/ && \
echo "=== HOME HIDDEN ===" && ls -la ~/ | grep '^\.' && \
echo "=== PROCESSES ===" && ps aux --sort=-%cpu | grep -v '\[' | grep deploy | head -20 && \
echo "=== NETWORK ===" && ss -tnp | grep ESTAB && \
echo "=== PM2 ===" && pm2 list && \
echo "=== LSATTR KEYS ===" && lsattr ~/.ssh/authorized_keys && \
echo "=== SSH CONFIG ===" && grep -E 'PermitRootLogin|PubkeyAuth|PasswordAuth' /etc/ssh/sshd_config | grep -v '#'
```

Compare every section output against the **Clean Baseline** at the top of this document.

---

## What the Jun 2026 Attack Looked Like

For reference — this is what was found during the compromise:

**Entry vector:** unknown (likely SSH key brute force or stolen credential before password auth was disabled)

**Attacker actions:**
1. Added RSA SSH backdoor key to `authorized_keys`
2. Set `chattr +i` on `authorized_keys` to prevent removal
3. Dropped cryptominer binary to `/dev/shm/duet`
4. Created hidden persistence dir: `/home/deploy/.syslog-893f53f7/`
5. Dropped 8MB binary to `/tmp/dashboard`
6. Created `.miner_fail_*` flag files in `/dev/shm/`
7. Installed malicious crontab entries (`pakchoi`, `wget|sh`, `docker`)
8. Ran process `bash grCW23` (random name to evade detection)

**Remediation:**
1. `sudo chattr -i ~/.ssh/authorized_keys`
2. `sudo tee ~/.ssh/authorized_keys` with only the legitimate ed25519 key
3. `kill -9` all malicious PIDs
4. `rm -f /dev/shm/duet /dev/shm/.miner_fail_*`
5. `rm -rf /home/deploy/.syslog-893f53f7/`
6. `rm -f /tmp/dashboard`
7. `crontab -e` → removed all malicious entries
8. Rotated all secrets

**Time to full remediation from discovery:** ~2 hours
