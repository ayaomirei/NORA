#!/usr/bin/env sh
# Подготовка full-stack на Vercel: Neon Postgres + env + деплой.
# Требует: neonctl auth (или NEON_API_KEY), vercel login.
set -e
cd "$(dirname "$0")/.."

echo "==> 1. Neon: создайте проект и скопируйте DATABASE_URL"
echo "    https://neon.tech — или: neonctl projects create --org-id YOUR_ORG"
echo "    neonctl connection-string --project-id YOUR_PROJECT"

if [ -z "$DATABASE_URL" ]; then
  echo "Задайте DATABASE_URL и запустите снова:"
  echo "  DATABASE_URL='postgresql://...' ./scripts/setup-vercel-fullstack.sh"
  exit 1
fi

echo "==> 2. Prisma schema → Neon"
cd server && npx prisma db push && cd ..

JWT="${JWT_SECRET:-$(openssl rand -hex 32)}"
echo "==> 3. Vercel env (production, preview, development)"
for ENV in production preview development; do
  printf '%s' "$DATABASE_URL" | npx vercel env add DATABASE_URL "$ENV" 2>/dev/null || true
  printf '%s' "$JWT" | npx vercel env add JWT_SECRET "$ENV" 2>/dev/null || true
done

if [ -n "$GEMINI_API_KEY" ]; then
  for ENV in production preview development; do
    printf '%s' "$GEMINI_API_KEY" | npx vercel env add GEMINI_API_KEY "$ENV" 2>/dev/null || true
    printf '%s' "${GEMINI_MODEL:-gemini-2.5-flash}" | npx vercel env add GEMINI_MODEL "$ENV" 2>/dev/null || true
  done
fi

echo "==> 4. Deploy"
npx vercel deploy --prod --yes
echo "Проверка: curl https://nora-red.vercel.app/api/health"
