#!/bin/sh
# Подсказка: задайте в Vercel Dashboard → Project nora → Settings → Environment Variables:
#   DATABASE_URL = postgresql://... (Neon)
#   JWT_SECRET   = случайная строка 32+ символов
# NEXT_PUBLIC_API_SAME_ORIGIN=1 уже в vercel.json

echo "Required Vercel env vars:"
echo "  DATABASE_URL"
echo "  JWT_SECRET"
echo ""
echo "Optional (AI «опиши день»):"
echo "  GEMINI_API_KEY"
echo "  GEMINI_MODEL=gemini-2.5-flash"
echo ""
echo "Then run schema once locally:"
echo "  cd server && DATABASE_URL='...' npx prisma db push"
