#!/usr/bin/env bash
# Restores the local dev database from production.
#
# Flow: ensure the local postgres container is up and migrated -> pg_dump the
# prod data (read-only on prod) -> truncate the local tables -> load the dump.
#
# The dump is piped through the local container's psql so the client version
# always matches the postgres:17 server (a host psql can be too old for the
# \restrict commands newer pg_dump emits).
#
# Local data is replaced wholesale - this is for recovering a wiped or stale
# dev database, so anything local-only is assumed disposable.

set -euo pipefail

REMOTE_HOST="root@intelslate.pro"
SSH_KEY="$HOME/.ssh/id_ed25519"
LOCAL_CONTAINER="intelslate-db"
REMOTE_CONTAINER="intelslate-db"
DB_USER="intelslate"
DB_NAME="intelslate"
TABLES="market_data, news_cache, portfolio_snapshots, stocks, system_config, users"

cd "$(git rev-parse --show-toplevel)"

echo "==> Starting local postgres"
docker compose up -d postgres
until docker exec "$LOCAL_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -q; do
  sleep 1
done

echo "==> Applying migrations to local database"
DATABASE_URL="postgresql://intelslate:intelslate_dev_password@localhost:5432/intelslate?schema=public" \
  npx prisma migrate deploy

echo "==> Dumping production data"
dump_file="$(mktemp -t intelslate_prod_dump)"
trap 'rm -f "$dump_file"' EXIT
ssh -i "$SSH_KEY" "$REMOTE_HOST" \
  "docker exec $REMOTE_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --exclude-table=_prisma_migrations" \
  > "$dump_file"

echo "==> Replacing local data"
docker exec "$LOCAL_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  -c "TRUNCATE $TABLES CASCADE;"
docker exec -i "$LOCAL_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  --single-transaction -v ON_ERROR_STOP=1 < "$dump_file" > /dev/null

echo "==> Restored row counts"
docker exec "$LOCAL_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT relname AS table, n_live_tup AS rows FROM pg_stat_user_tables WHERE relname <> '_prisma_migrations' ORDER BY relname;"

echo "Done: local database now mirrors production."
