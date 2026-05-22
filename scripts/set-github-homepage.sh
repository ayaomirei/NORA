#!/usr/bin/env sh
# Обновляет поле Website репозитория на GitHub (About → ссылка на Vercel).
set -e
URL="${1:-https://nora-red.vercel.app}"
REPO="${GITHUB_REPO:-Ayaopakana/NORA}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Установите GitHub CLI: brew install gh && gh auth login"
  exit 1
fi

gh repo edit "$REPO" --homepage "$URL"
echo "OK: $REPO homepage -> $URL"
