# Деплой full-stack NORA на Vercel

Фронт (Next.js) и API (Fastify) работают **в одном проекте Vercel**: запросы к `/api/*` проксируются в тот же бэкенд, что и `server/` локально.

## 1. База данных (обязательно)

SQLite на Vercel **не подходит** (нет постоянного диска). Используйте **PostgreSQL**:

1. [Neon](https://neon.tech) или [Vercel Postgres](https://vercel.com/storage/postgres) — создайте БД.
2. Скопируйте connection string (`postgresql://...`).

Первичная схема (один раз, с локальной машины):

```bash
cd server
cp .env.example .env
# DATABASE_URL=postgresql://...
npx prisma db push
```

## 2. Переменные в Vercel (Project → Settings → Environment Variables)

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | `postgresql://...` из Neon |
| `JWT_SECRET` | длинная случайная строка |
| `NEXT_PUBLIC_API_SAME_ORIGIN` | `1` (уже в `vercel.json`) |
| `DGIS_API_KEY` | по желанию — геокодинг и маршруты по дорогам |
| `GEMINI_API_KEY` | по желанию — ИИ «опиши день» (Google AI Studio) |
| `GEMINI_MODEL` | `gemini-2.5-flash` (по умолчанию; у `2.0-flash` часто 429 на free tier) |
| `OPENAI_API_KEY` | альтернатива Gemini для того же ИИ |

**Не задавайте** `NEXT_PUBLIC_API_URL` на Vercel — API на том же домене (`/api/...`).

## 3. Деплой

1. Подключите репозиторий GitHub к [Vercel](https://vercel.com).
2. Root Directory: корень репо (где `package.json` NORA).
3. Framework Preset: **Next.js** (подхватит `vercel.json`).
4. Deploy.

Проверка после деплоя:

- [https://nora-red.vercel.app](https://nora-red.vercel.app) — приложение (текущий деплой)
- [https://nora-red.vercel.app/api/health](https://nora-red.vercel.app/api/health) — JSON `{"ok":true}` (нужны `DATABASE_URL` и `JWT_SECRET` в Vercel)

## 4. Локальная разработка (как раньше)

**Вариант A — два процесса (привычно):**

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
npm run dev:api   # терминал 1, нужен server/.env с DATABASE_URL
npm run dev       # терминал 2
```

**Вариант B — как на Vercel (один Next):**

```env
# .env.local
NEXT_PUBLIC_API_SAME_ORIGIN=1
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

```bash
npm run dev
# API: http://localhost:3000/api/health
```

## 5. Ограничения serverless

- Первый запрос после простоя может быть медленнее (cold start).
- Долгие скрипты (`geocode:places`) — только локально или отдельным CI, не в runtime Vercel.
- Запись в `place-coords.json` на проде ограничена; каталог читается из репозитория.
