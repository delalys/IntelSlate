#!/usr/bin/env bash
# Deploys the current local master branch to the production VPS.
#
# Flow: local safety checks (clean tree, lint, tests) -> push -> verify the
# server's checkout is clean -> reset it to origin/master -> rebuild and
# restart the app container.
#
# The server has no working directory of its own to preserve (the app runs
# from a Docker image built from this checkout), so resetting it to
# origin/master is safe as long as it started clean - which this script
# checks before touching anything.

set -euo pipefail

REMOTE_HOST="root@intelslate.pro"
REMOTE_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/IntelSlate"
SSH_KEY="$HOME/.ssh/id_ed25519"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$(git rev-parse --show-toplevel)"

echo "==> Checking local git state"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Local working tree is dirty. Commit or stash changes before deploying." >&2
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" != "master" ]]; then
  echo "Refusing to deploy from branch '$current_branch' (expected master)." >&2
  exit 1
fi

echo "==> Running lint (npx biome check .)"
npx biome check .

echo "==> Running tests (npm test)"
npm test

echo "==> Pushing to origin/master"
git push origin master

echo "==> Verifying server working tree is clean"
ssh -i "$SSH_KEY" "$REMOTE_HOST" \
  "sudo -u $REMOTE_USER bash -c 'cd $REMOTE_DIR && if [ -n \"\$(git status --porcelain)\" ]; then echo \"Server working tree is dirty; aborting\" >&2; exit 1; fi'"

echo "==> Fetching and resetting server checkout to origin/master"
ssh -i "$SSH_KEY" "$REMOTE_HOST" \
  "sudo -u $REMOTE_USER bash -c 'cd $REMOTE_DIR && git fetch origin && git reset --hard origin/master'"

echo "==> Building app image"
ssh -i "$SSH_KEY" "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE build app"

echo "==> Restarting app container"
ssh -i "$SSH_KEY" "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d app"

echo "==> Health check"
sleep 3
if curl -fsS -o /dev/null "https://intelslate.pro/en"; then
  echo "Deploy succeeded: https://intelslate.pro is responding."
else
  echo "Deploy finished but the health check failed - check the server." >&2
  exit 1
fi
