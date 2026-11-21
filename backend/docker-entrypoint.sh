#!/bin/sh
set -eu

if [ "${IS_PULL_REQUEST:-false}" = "true" ]; then
  if [ -z "${PREVIEW_DATABASE_URL:-}" ]; then
    printf '%s\n' "Refusing PR preview startup: set PREVIEW_DATABASE_URL to the isolated test database." >&2
    exit 1
  fi

  export DATABASE_URL="$PREVIEW_DATABASE_URL"
fi

python manage.py migrate --noinput
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --access-logfile -
