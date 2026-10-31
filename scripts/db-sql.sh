#!/bin/zsh
# Run a SQL file against the Supabase project via the Management API.
# usage: scripts/db-sql.sh <file.sql>    (needs SUPABASE_ACCESS_TOKEN in .env; the token is never printed)
set -e
ROOT=${0:A:h:h}
set -a; . "$ROOT/.env"; set +a
REF=${SUPABASE_PROJECT_REF:-pjxbvsgbvgfwbvrbdpct}
BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT
python3 -I -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' "$1" > "$BODY"
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" --data @"$BODY"
echo
