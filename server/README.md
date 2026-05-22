# NORA API (`server/`)

HTTP API для фронтенда NORA. Общее описание проекта, установка и архитектура — в [корневом README](../README.md).

## Запуск

```bash
cp .env.example .env
npm install
npm run db:push
npm run dev
```

Проверка: `curl http://localhost:3001/health`

## Переменные окружения

См. [README → Переменные окружения](../README.md#переменные-окружения) и `.env.example`.

## Эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Статус сервиса |
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Вход (JWT) |
| GET | `/auth/me` | Текущий пользователь |
| PATCH | `/users/me` | Профиль |
| GET/PATCH | `/users/me/settings` | Уведомления |
| POST | `/users/me/password` | Смена пароля |
| DELETE | `/users/me` | Удаление аккаунта |
| GET | `/users/search?q=` | Поиск людей |
| GET | `/users/:id/profile` | Публичный профиль |
| GET/POST/DELETE | `/routes` | Сохранённые маршруты |
| GET/POST | `/social/*` | Друзья, заявки, чат |
| GET/POST/PUT | `/places/*` | Отзывы и предпочтения мест |
| GET | `/map/places/coords` | Кэш координат (JSON) |
| GET | `/map/places/catalog` | Каталог POI с координатами |
| GET | `/ai/status` | LLM: `provider` (`gemini` / `openai`), `model` |
| POST | `/ai/parse-day-intent` | Разбор «опиши день» → JSON для конструктора маршрута |
| POST | `/map/route` | Пешеходная геометрия (2GIS → OSRM → прямая) |
| POST | `/map/places/refresh` | Прогон геокодера (dev) |

## 2GIS

Карта на клиенте — **MapLibre** (OpenFreeMap). 2GIS на сервере:

- геокодинг каталога → `data/place-coords.json`;
- маршруты пешком для `POST /map/route`.

```bash
npm run geocode:places          # первичное заполнение
npm run geocode:places:force    # перезапись всех id
npm run coords:fix              # ручные корректировки
```

Без `DGIS_API_KEY` координаты и линии маршрута работают в упрощённом режиме.
