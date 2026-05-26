# Vercel + GitHub org `Ayaopakana` — почему не цепляется и что делать

Проект на Vercel: **keyybes-projects/nora** → https://nora-red.vercel.app  
Репозиторий: **https://github.com/Ayaopakana/NORA**

Ошибка в UI/CLI: `Failed to connect Ayaopakana/NORA` — у приложения **Vercel for GitHub** нет доступа к организации, даже если у вас admin в репо.

---

## Вариант A — починить доступ GitHub App (если нужен деплой из UI)

Делает **владелец org** или тот, кто может менять GitHub Apps организации.

1. Откройте:  
   **https://github.com/organizations/Ayaopakana/settings/installations**
2. Найдите **Vercel** → **Configure**.
3. **Repository access** → «All repositories» или явно отметьте **NORA**.
4. Сохраните.
5. Если org с **SAML SSO** — на странице установки нажмите **Authorize** / **Grant** для Vercel (SSO для сторонних приложений).
6. В Vercel: https://vercel.com/account/integrations → **GitHub** → убедитесь, что аккаунт `keyybe` подключён и видит org **Ayaopakana**.
7. Снова: Project **nora** → **Settings** → **Git** → Connect → `Ayaopakana/NORA`, branch `main`.

Если Vercel в списке установок org **нет** — установите с нуля:  
https://vercel.com/new → Import Git Repository → GitHub → при запросе доступа выберите организацию **Ayaopakana**.

---

## Вариант B — GitHub Actions (рекомендуется, без UI Git)

В репозитории есть workflow `.github/workflows/vercel-production.yml` — деплой при каждом `push` в `main`.

### 1. Токен Vercel

https://vercel.com/account/tokens → **Create** → скопируйте токен.

### 2. Секреты в GitHub

Репозиторий **NORA** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Значение |
|--------|----------|
| `VERCEL_TOKEN` | токен из шага 1 |
| `VERCEL_ORG_ID` | `team_F7Dm7ZdqehKh4mwQhXlhuOY9` |
| `VERCEL_PROJECT_ID` | `prj_h3l1PNIHVVrenWuDPG0wcagzTNph` |

(ID уже в `.vercel/project.json` в корне проекта.)

### 3. Запуск

```bash
git add .github/workflows/vercel-production.yml docs/VERCEL_GITHUB_ORG.md
git commit -m "ci: deploy to Vercel on push to main"
git push origin main
```

Вкладка **Actions** на GitHub → workflow **Deploy Production** должен стать зелёным.  
Прод: https://nora-red.vercel.app

Переменные `DATABASE_URL`, `JWT_SECRET` и др. по-прежнему только в **Vercel** → Project → Environment Variables (Actions их подтягивает через `vercel pull`).

---

## Локальный деплой без Git

Если срочно обновить прод с машины (как уже делали):

```bash
cd /path/to/NORA
vercel deploy --prod
```

Нужны: `vercel login`, файл `.vercel/project.json` (уже есть после `vercel link`).

---

## Частые причины

| Симптом | Причина |
|---------|---------|
| Org не в списке при Import | Vercel App не установлена на org |
| Repo есть, Connect падает | Нет доступа к этому репо в настройках App |
| Только личные репо видны | В GitHub при установке Vercel не выбрали org |
| SSO org | Нужен Grant для Vercel в SSO |

Если после варианта A org всё равно не видна — используйте **вариант B**; для NORA этого достаточно.
