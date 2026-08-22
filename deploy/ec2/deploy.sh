#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/../.."

if [ ! -f .env.production ]; then
  echo "Missing .env.production. Copy .env.production.example and fill in production values." >&2
  exit 1
fi

network_name="${CV_ONLINE_NETWORK:-cv-online_default}"
if ! docker network inspect "$network_name" >/dev/null 2>&1; then
  echo "Docker network '$network_name' does not exist. Check: docker network ls" >&2
  exit 1
fi

docker compose --env-file .env.production -f compose.production.yml up -d --build --remove-orphans
docker compose --env-file .env.production -f compose.production.yml ps
docker image prune -f

