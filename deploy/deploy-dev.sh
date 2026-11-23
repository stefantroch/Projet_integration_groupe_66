#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd "$(git rev-parse --show-toplevel)"

exec 9>.git/deploy-dev.lock
flock -n 9 || exit 0

if [[ "$(git branch --show-current)" != dev ]]; then
  echo "Le depot doit etre sur la branche dev."
  exit 1
fi

TARGET=$(gh api \
  'repos/stefantroch/Projet_integration_groupe_66/actions/workflows/ci.yml/runs?branch=dev&event=push&status=success&per_page=1' \
  --jq '.workflow_runs[0].head_sha // empty')

if [[ -z "$TARGET" ]]; then
  echo "Aucun push dev valide par la CI."
  exit 0
fi
[[ "$TARGET" =~ ^[0-9a-f]{40}$ ]]

git fetch --quiet origin dev
if [[ "$TARGET" != "$(git rev-parse FETCH_HEAD)" ]]; then
  echo "En attente de la CI du dernier commit dev."
  exit 0
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Des fichiers suivis sont modifies localement. Deploiement interrompu."
  exit 1
fi
if [[ "$(cat .git/deployed-dev-sha 2>/dev/null || true)" == "$TARGET" \
   && "$(git rev-parse HEAD)" == "$TARGET" ]]; then
  echo "Deja deploye : $TARGET"
  exit 0
fi

git merge --ff-only "$TARGET"
docker compose config --quiet
docker compose build
docker compose up -d --wait postgres

mkdir -p .git/deploy-backups
BACKUP=".git/deploy-backups/$(date -u +%Y%m%dT%H%M%SZ).sql"
docker compose exec -T postgres pg_dump -U dev -d projet66 > "$BACKUP.tmp"
mv "$BACKUP.tmp" "$BACKUP"

docker compose run --rm --no-deps backend sh -ec '
TARGET=$(node -p "require(\"./src/prisma/contract.json\").storage.storageHash")
node node_modules/prisma/dist/prisma.js db migrate --to "$TARGET" --yes --confirm backend
'

docker compose up -d --no-deps --force-recreate backend frontend recognition

DEADLINE=$((SECONDS + 300))
READY=0
while (( SECONDS < DEADLINE )); do
  if curl -fsS --max-time 15 http://127.0.0.1:3000/api/auth/get-session >/dev/null 2>&1 \
    && curl -fsS --max-time 15 http://127.0.0.1:8081/ >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 5
done
if [[ "$READY" != 1 ]]; then
  docker compose logs --tail=60 backend frontend
  echo "Les services ne repondent pas correctement."
  exit 1
fi

printf '%s\n' "$TARGET" > .git/deployed-dev-sha.tmp
mv .git/deployed-dev-sha.tmp .git/deployed-dev-sha
find .git/deploy-backups -maxdepth 1 -type f -name '*.sql' -mtime +7 -delete
docker image prune -f || true
echo "Deploiement valide : $TARGET"
