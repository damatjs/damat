#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/../../.." && pwd)
cd "$root"
env_file=${COMPOSE_ENV_FILE:-backend/default/.env.production.local}
compose_file=backend/default/docker-compose.yml
evidence=${RELEASE_EVIDENCE_FILE:-/tmp/damat-release-evidence.txt}
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-damat-production-drill}
export COMPOSE_PROJECT_NAME

if [ ! -f "$env_file" ]; then
  echo "Missing $env_file; run bun run --cwd backend/default ops:env" >&2
  exit 1
fi

set -a
. "$env_file"
set +a

compose() {
  docker compose -p "$COMPOSE_PROJECT_NAME" --env-file "$env_file" \
    -f "$compose_file" "$@"
}

wait_for_redis() {
  attempts=0
  until compose exec -T redis sh -ec \
    'redis-cli --no-auth-warning -u "redis://damat:${REDIS_PASSWORD}@127.0.0.1:6379" ping' \
    >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then echo "Redis did not become ready" >&2; return 1; fi
    sleep 1
  done
}

cleanup() {
  status=$?
  trap - EXIT INT TERM
  set +e
  if [ "$status" -ne 0 ]; then
    compose logs --no-color > "${evidence}.logs" 2>&1
    echo "Failure logs: ${evidence}.logs" >&2
  fi
  compose --profile accelerator --profile operations down --volumes --remove-orphans
  if [ "${DELETE_COMPOSE_ENV:-false}" = "true" ]; then rm -f -- "$env_file"; fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

bun run --cwd backend/default ops:validate
compose --profile accelerator --profile operations config --quiet
compose --profile accelerator up -d db redis
wait_for_redis
compose --profile accelerator up --build -d migrate api jobs events pipelines
bun run --cwd backend/default ops:smoke
compose --profile operations run --rm acceptance
compose --profile accelerator run --rm redis-acceptance
compose --profile operations run --rm worker-acceptance
compose --profile accelerator stop redis
compose --profile operations run --rm -e REDIS_URL= \
  -e ACCEPTANCE_MODE=postgres-fallback worker-acceptance
compose --profile accelerator start redis
wait_for_redis
bun run --cwd backend/default ops:load
compose --profile operations run --rm backup
compose --profile operations up -d restore-db
compose --profile operations run --rm restore-drill
docker tag damat-default:local damat-default:rollback-drill
DAMAT_ALLOW_MUTABLE_ROLLBACK=true \
  bun run --cwd backend/default ops:rollback -- damat-default:rollback-drill
bun run --cwd backend/default ops:smoke
docker image inspect damat-default:local --format='{{.Id}}' > "$evidence"
git rev-parse HEAD >> "$evidence"
echo "Production staging drill passed. Evidence: $evidence"
