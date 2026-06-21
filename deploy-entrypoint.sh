#!/bin/bash
# Forced command entrypoint for GitHub Actions SSH key.
# This script is the ONLY thing the github-actions key can run.
# Even if the key is stolen, the attacker gets a dead end — no shell.

ALLOWED_CMDS=(
  "rsync --server"
  "mkdir -p /home/deploy/apps/liveportfolio__incoming"
)

CMD="${SSH_ORIGINAL_COMMAND:-}"

# Allow rsync (used for file transfer)
if [[ "$CMD" == rsync\ --server* ]]; then
  exec $CMD
  exit 0
fi

# Allow mkdir for incoming directory setup
if [[ "$CMD" == "mkdir -p /home/deploy/apps/liveportfolio__incoming" ]]; then
  exec $CMD
  exit 0
fi

# Allow the deploy script
if [[ "$CMD" == "bash /home/deploy/apps/liveportfolio/scripts/vps-deploy.sh" ]]; then
  exec bash /home/deploy/apps/liveportfolio/scripts/vps-deploy.sh
  exit 0
fi

# Everything else — including interactive shells — is rejected
echo "Unauthorized command: $CMD" >&2
exit 1
