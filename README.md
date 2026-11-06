# KOMPIK67

Веб-приложение для подбора и заказа персональных компьютеров. Пользователь может выбрать готовую конфигурацию ПК или сформировать заявку через конфигуратор, указать контактные данные и отправить запрос. В проекте также предусмотрена административная CRM-панель для обработки заявок и управления каталогом.

> **Важно о структуре репозитория.** В репозитории находятся две реализации приложения:
>
> 1. **Docker-стек (основной сценарий запуска):** `frontend/` (React + Vite) + `backend/` (FastAPI) + PostgreSQL. Именно эти сервисы запускает корневой `docker-compose.yml`.
> 2. **Отдельная реализация на Next.js:** корневые `src/` и `package.json` (Next.js + Drizzle ORM). Она содержит собственный интерфейс и API, но в текущий `docker-compose.yml` не включена.
>
> Эти варианты используют схожую модель данных, но имеют разные точки входа и команды запуска. Не следует запускать их как один общий frontend/backend без дополнительной настройки.

## Содержание

- [Возможности](#возможности)
- [Технологический стек](#технологический-стек)
- [Архитектура](#архитектура)
- [Схема сущностей базы данных](#схема-сущностей-базы-данных)
- [Структура проекта](#структура-проекта)
- [Требования](#требования)
- [Быстрый запуск через Docker](#быстрый-запуск-через-docker)
- [Локальный запуск без Docker](#локальный-запуск-без-docker)
- [Запуск Nextjs-версии](#запуск-nextjs-версии)
- [Переменные окружения](#переменные-окружения)
- [API](#api)
- [Начальные данные](#начальные-данные)
- [Административная панель](#административная-панель)
- [Проверка и диагностика](#проверка-и-диагностика)
- [Бизнес-процессы](#бизнес-процессы)
- [Безопасность и рекомендации для production](#безопасность-и-рекомендации-для-production)

## Возможности

### Пользовательская часть

- Просмотр каталога готовых сборок ПК: Start, Flow и Ultra.
- Просмотр стоимости и списка комплектующих каждой сборки.
- Выбор готовой конфигурации.
- Конфигуратор по назначению компьютера и целевому уровню производительности.
- Расчёт ориентировочной цены в интерфейсе.
- Отправка заявки с именем, телефоном и комментарием.
- Сохранение выбранной сборки или параметров конфигуратора в заявке.

### Серверная часть

- Получение списка сборок.
- Создание заявки.
- Поиск клиента по номеру телефона и повторное использование записи клиента.
- Проверка существования выбранной сборки.
- Присвоение новой заявке статуса `new`.
- Получение заявки по ID (FastAPI-реализация).
- Проверка доступности API.

### Администрирование (FastAPI)

- Вход в CRM-панель.
- Просмотр и редактирование заявок, клиентов, сборок, комплектующих, категорий и статусов.
- Перевод заявок в статусы «Принята», «В сборке», «Выполнена» и «Отклонена».

## Технологический стек

| Уровень | Технологии |
|---|---|
| UI Docker-версии | React 18, TypeScript, Vite |
| UI Next.js-версии | Next.js 16, React 19, TypeScript |
| Стили Docker-версии | Tailwind CSS 4, Vite plugin |
| Сервер Docker-версии | Python 3.12, FastAPI, Uvicorn |
| Сервер Next.js-версии | Next.js Route Handlers |
| ORM Docker-версии | SQLAlchemy 2 (asyncio) |
| ORM Next.js-версии | Drizzle ORM |
| База данных | PostgreSQL 16 |
| HTTP-клиент | Axios |
| Админ-панель | Starlette-Admin |
| Контейнеризация | Docker, Docker Compose |
| Веб-сервер frontend-контейнера | Nginx |

## Архитектура

### Основной Docker-сценарий

```mermaid
flowchart TB
    U["Пользователь / браузер"] --> N["Nginx :3000"]
    N --> V["React + Vite frontend"]
    N -->|"/api/* и /admin"| API["FastAPI backend :8000"]
    V -->|"HTTP /api/builds, POST /api/orders"| API
    API --> S["Application services"]
    S --> D["Domain entities / repositories"]
    D --> R["SQLAlchemy repositories"]
    R --> DB[("PostgreSQL :5432")]
    API --> ADM["Starlette-Admin CRM"]
    ADM --> DB
    PA["pgAdmin :5050"] --> DB
```

В Docker-сценарии браузер обращается к опубликованному порту `3000`. Nginx отдаёт собранное SPA-приложение, а запросы `/api/` и `/admin` проксирует в FastAPI. FastAPI выполняет бизнес-логику и работает с PostgreSQL через SQLAlchemy.

### Слои FastAPI backend

```mermaid
flowchart TD
    HTTP["HTTP request"] --> ROUTE["presentation/api/routes.py"]
    ROUTE --> DEP["presentation/api/deps.py"]
    DEP --> SERVICE["application/services.py"]
    SERVICE --> SCHEMA["application/schemas.py"]
    SERVICE --> ENTITY["domain/entities.py"]
    SERVICE --> REPO["domain/repositories.py"]
    REPO --> IMPL["infrastructure/db/repositories.py"]
    IMPL --> MODEL["infrastructure/db/models.py"]
    MODEL --> PG[("PostgreSQL")]
    ADMIN["presentation/admin/*"] --> MODEL
```

- **Presentation** — HTTP-маршруты, зависимости и административный интерфейс.
- **Application** — сценарии приложения и DTO/Pydantic-схемы.
- **Domain** — сущности, статусы и интерфейсы репозиториев.
- **Infrastructure** — SQLAlchemy-модели, подключение к БД, реализации репозиториев и начальные данные.

### Next.js-реализация

Корневые `src/` и `package.json` образуют самостоятельное приложение:

```mermaid
flowchart TD
    B["Браузер"] --> NEXT["Next.js application"]
    NEXT --> PAGE["src/app/page.tsx"]
    PAGE --> UI["src/components/App.tsx"]
    UI --> CLIENT["src/components/api/client.ts"]
    CLIENT --> ROUTES["Next.js Route Handlers"]
    ROUTES --> DBL["Drizzle ORM"]
    DBL --> PG[("PostgreSQL")]
```

В этой реализации UI вызывает API через относительный адрес `/api`. Маршруты находятся в `src/app/api/`, подключение к PostgreSQL — в `src/db/index.ts`, схема — в `src/db/schema.ts`.

## Схема сущностей базы данных

В проекте описаны **7 связанных таблиц**. Диаграмма ниже соответствует SQLAlchemy-моделям FastAPI и Drizzle-схеме Next.js.

```mermaid
erDiagram
    CLIENTS ||--o{ ORDERS : "создаёт"
    STATUSES ||--o{ ORDERS : "имеет статус"
    BUILDS o|--o{ ORDERS : "выбрана в"
    BUILDS ||--o{ BUILD_COMPONENTS : "содержит"
    COMPONENTS ||--o{ BUILD_COMPONENTS : "входит в"
    CATEGORIES ||--o{ COMPONENTS : "группирует"

    CLIENTS {
        int id PK
        varchar name
        varchar phone UK
        varchar email
        timestamp created_at
    }
    STATUSES {
        int id PK
        varchar code UK
        varchar name
    }
    ORDERS {
        int id PK
        int client_id FK
        int status_id FK
        int build_id FK
        varchar purpose
        varchar performance
        numeric estimated_price
        text message
        timestamp created_at
    }
    BUILDS {
        int id PK
        varchar name
        varchar label
        numeric price
        varchar tone
        boolean featured
    }
    CATEGORIES {
        int id PK
        varchar name UK
    }
    COMPONENTS {
        int id PK
        varchar name
        numeric price
        int stock
        int category_id FK
    }
    BUILD_COMPONENTS {
        int id PK
        int build_id FK
        int component_id FK
        int quantity
    }
```

### Описание сущностей

| Таблица | Назначение | Основные поля и связи |
|---|---|---|
| `clients` | Клиенты, оставившие заявку | `name`, уникальный `phone`, `email`, `created_at`. Один клиент может иметь несколько заявок. |
| `statuses` | Справочник статусов заявок | Уникальный `code` и отображаемое `name`. Один статус может быть назначен многим заявкам. |
| `orders` | Заявки на сборку ПК | Ссылки на клиента и статус, необязательная ссылка на сборку, назначение, производительность, оценка цены и комментарий. |
| `builds` | Готовые конфигурации ПК | Название, подпись, цена, оформление карточки, признак рекомендуемой сборки. |
| `categories` | Категории комплектующих | Например, процессор, видеокарта, оперативная память, накопитель. |
| `components` | Комплектующие | Название, цена, остаток на складе и ссылка на категорию. |
| `build_components` | Состав готовых сборок | Связующая таблица между сборками и комплектующими; хранит количество. |

### Связи и правила удаления

- `clients → orders`: один клиент — много заявок. Удаление клиента каскадно удаляет его заявки (`CASCADE`).
- `statuses → orders`: один статус — много заявок. Статус заявки обязателен.
- `builds → orders`: заявка может ссылаться на сборку или не иметь её. При удалении сборки ссылка в заявке обнуляется (`SET NULL`).
- `builds → build_components`: состав сборки удаляется вместе со сборкой (`CASCADE`).
- `components → build_components`: удаление комплектующего, используемого в сборке, ограничено (`RESTRICT`).
- `categories → components`: удаление категории, у которой есть комплектующие, ограничено (`RESTRICT`).

`build_components` реализует связь «многие ко многим» между сборками и комплектующими. Поле `quantity` задаёт количество конкретного комплектующего в сборке.

### Статусы заявки

| Код | Отображаемое значение | Смысл |
|---|---|---|
| `new` | Новая | Заявка создана, ожидает обработки |
| `accepted` | Принята | Заявка принята менеджером |
| `in_progress` | В сборке | Заказ находится в работе |
| `done` | Выполнена | Заказ завершён |
| `rejected` | Отклонена | Заявка отклонена |

## Структура проекта

```text
compik67-main/
├── backend/                      # FastAPI backend для Docker-сценария
│   ├── app/
│   │   ├── application/          # Сервисы и Pydantic-схемы
│   │   ├── core/                 # Конфигурация
│   │   ├── domain/               # Доменные сущности и контракты репозиториев
│   │   ├── infrastructure/db/    # SQLAlchemy, БД, репозитории, seed
│   │   ├── presentation/
│   │   │   ├── admin/            # CRM и авторизация
│   │   │   └── api/              # API-маршруты и зависимости
│   │   └── main.py               # Точка входа FastAPI
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                     # React + Vite SPA для Docker-сценария
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf                 # Раздача SPA и proxy к backend
├── src/                           # Отдельная Next.js-реализация
│   ├── app/
│   │   ├── api/builds/            # GET /api/builds
│   │   ├── api/orders/            # POST /api/orders
│   │   ├── api/health/             # GET /api/health
│   │   └── ...
│   ├── components/                # UI и API-клиент
│   ├── db/                        # Drizzle schema и подключение
│   └── lib/                       # Начальные данные
├── docker-compose.yml             # PostgreSQL, pgAdmin, FastAPI, Vite/Nginx
├── package.json                   # Скрипты Next.js-реализации
├── drizzle.config.json
└── README.md
```

## Требования

Для Docker-запуска:

- Docker Engine или Docker Desktop.
- Docker Compose v2 (`docker compose`).

Для локального запуска:

- Python 3.12.
- Node.js 20 или новее.
- npm.
- PostgreSQL 16 (или совместимая версия).

## Быстрый запуск через Docker

Это рекомендуемый способ поднять стек, который уже описан в `docker-compose.yml`.

### Шаг 1. Распаковать проект и перейти в корень

```bash
unzip compik67-main.zip
cd compik67-main
```

Если проект уже клонирован или распакован, перейдите в каталог, где находится `docker-compose.yml`.

### Шаг 2. Создать `.env`

Создайте файл `.env` в корне проекта. В репозитории корневой `.env.example` сейчас пустой, поэтому заполните его вручную:

```dotenv
POSTGRES_USER=kompik
POSTGRES_PASSWORD=change_this_db_password
POSTGRES_DB=pc_builds

PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=change_this_pgadmin_password

SECRET_KEY=replace_with_a_long_random_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_admin_password

CORS_ORIGINS=http://localhost:3000
```

Для реального окружения обязательно замените все пароли и `SECRET_KEY` на уникальные значения. Не коммитьте `.env` в Git.

### Шаг 3. Собрать и запустить контейнеры

```bash
docker compose up --build -d
```

Команда поднимает четыре сервиса:

| Сервис | Назначение | Адрес на хосте |
|---|---|---|
| `frontend` | React SPA + Nginx | http://localhost:3000 |
| `backend` | FastAPI | http://localhost:8001 |
| `db` | PostgreSQL | `localhost:5432` |
| `pgadmin` | Управление PostgreSQL | http://localhost:5050 |

### Шаг 4. Проверить состояние контейнеров

```bash
docker compose ps
docker compose logs -f backend
```

При первом запуске backend создаёт таблицы и заполняет пустую БД начальными данными.

### Шаг 5. Открыть приложение

- Сайт: http://localhost:3000
- API health check: http://localhost:8001/api/health
- Список сборок: http://localhost:8001/api/builds
- CRM: http://localhost:3000/admin
- pgAdmin: http://localhost:5050

Для входа в CRM используйте `ADMIN_USERNAME` и `ADMIN_PASSWORD` из `.env`.

### Полезные Docker-команды

```bash
# Остановить контейнеры, сохранив данные БД
docker compose down

# Запустить снова
docker compose up -d

# Пересобрать конкретный сервис
docker compose build backend
docker compose up -d backend

# Посмотреть логи
docker compose logs -f
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f db

# Остановить контейнеры и удалить тома (ВНИМАНИЕ: данные БД будут удалены)
docker compose down -v
```

## Локальный запуск без Docker

Ниже приведён запуск пары **FastAPI + Vite**. PostgreSQL к этому моменту уже должен быть установлен и запущен.

### Шаг 1. Подготовить базу данных

Создайте БД и пользователя, например:

```sql
CREATE USER kompik WITH PASSWORD 'change_this_password';
CREATE DATABASE pc_builds OWNER kompik;
```

### Шаг 2. Настроить backend

```bash
cd backend
python -m venv .venv
```

Активация виртуального окружения:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Установить зависимости:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Создать `backend/.env` на основе `backend/.env.example`:

```dotenv
DATABASE_URL=postgresql+asyncpg://kompik:change_this_password@localhost:5432/pc_builds
SECRET_KEY=replace_with_a_long_random_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_admin_password
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Запустить API из каталога `backend`:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API будет доступен по адресу http://localhost:8000. При старте FastAPI выполняется инициализация таблиц и начальных данных.

### Шаг 3. Запустить frontend

Откройте второй терминал из корня проекта:

```bash
cd frontend
npm install
npm run dev
```

Vite обычно запускает приложение на http://localhost:5173. Убедитесь, что API доступен, а адрес frontend включён в `CORS_ORIGINS`.

> При локальном запуске Vite dev server и FastAPI работают на разных origin. Если в frontend используется относительный путь `/api`, настройте proxy в `frontend/vite.config.ts` либо используйте соответствующий API base URL. В Docker эту маршрутизацию выполняет Nginx (`frontend/nginx.conf`).

## Запуск Next.js-версии

Корневые `package.json` и `src/` — самостоятельный вариант приложения. Он не запускается командами из `frontend/`.

### Шаг 1. Подготовить PostgreSQL

Создайте базу данных. Например:

```sql
CREATE USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE app_db OWNER postgres;
```

Если пользователь `postgres` уже существует, повторно создавать его не нужно.

### Шаг 2. Установить Node.js-зависимости

Из корня проекта:

```bash
npm install
```

### Шаг 3. Настроить подключение к БД

Задайте переменную окружения `DATABASE_URL`:

```bash
# macOS / Linux
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"

# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
```

Для постоянной настройки можно создать `.env.local` в корне:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

### Шаг 4. Запустить приложение

```bash
npm run dev
```

Откройте http://localhost:3000.

### Шаг 5. Production-сборка и проверки

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```

> **Примечание по схеме БД.** Next.js-версия вызывает `ensureSeed()` из API маршрутов. Функция проверяет наличие записей и добавляет стартовые статусы, категории, комплектующие и сборки. Отдельная команда миграций в текущем проекте не настроена. `drizzle.config.json` содержит локальный URL подключения; для другой среды обновите его или используйте переменные окружения и миграционный процесс, настроенный вашей командой.

## Переменные окружения

### Docker Compose (файл `.env` в корне)

| Переменная | Назначение | Пример |
|---|---|---|
| `POSTGRES_USER` | Пользователь PostgreSQL | `kompik` |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL | Сложный пароль |
| `POSTGRES_DB` | Имя базы данных | `pc_builds` |
| `PGADMIN_EMAIL` | Логин pgAdmin | `admin@example.com` |
| `PGADMIN_PASSWORD` | Пароль pgAdmin | Сложный пароль |
| `SECRET_KEY` | Секрет для сессий админки | Случайная длинная строка |
| `ADMIN_USERNAME` | Логин CRM | `admin` |
| `ADMIN_PASSWORD` | Пароль CRM | Сложный пароль |
| `CORS_ORIGINS` | Разрешённые frontend-origin через запятую | `http://localhost:3000` |

### FastAPI (`backend/.env`)

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | DSN SQLAlchemy с драйвером `postgresql+asyncpg` |
| `SECRET_KEY` | Секрет сессии административной панели |
| `ADMIN_USERNAME` | Имя администратора |
| `ADMIN_PASSWORD` | Пароль администратора |
| `CORS_ORIGINS` | Список разрешённых origin через запятую |

### Next.js

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | Строка подключения `pg`/Drizzle, например `postgresql://user:password@localhost:5432/app_db` |

## API

### FastAPI (Docker-версия)

Базовый адрес при Docker-запуске: `http://localhost:8001`. Через frontend/Nginx API доступно на том же origin, что и сайт: `http://localhost:3000/api`.

| Метод | Endpoint | Назначение |
|---|---|---|
| `GET` | `/api/health` | Проверка доступности backend |
| `GET` | `/api/builds` | Получить список готовых сборок |
| `POST` | `/api/orders` | Создать заявку |
| `GET` | `/api/orders/{order_id}` | Получить заявку по ID |

#### Пример: получить сборки

```bash
curl http://localhost:8001/api/builds
```

Ответ — массив сборок с полями, включающими идентификатор, название, подпись, цену и состав комплектующих (`specs`).

#### Пример: создать заявку

```bash
curl -X POST http://localhost:8001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван",
    "phone": "+79990000000",
    "email": "ivan@example.com",
    "message": "Нужен компьютер для игр",
    "build_id": 1,
    "purpose": "games",
    "performance": "2k",
    "estimated_price": 149900
  }'
```

Ожидаемый успешный ответ имеет HTTP-код `201` и содержит ID заявки, статус и дату создания. Точная форма ответа определяется `OrderOut` в `backend/app/application/schemas.py`.

#### Пример: получить заявку

```bash
curl http://localhost:8001/api/orders/1
```

Если заявка не найдена, API возвращает `404`.

### Next.js API

В корневой Next.js-реализации сейчас присутствуют маршруты:

| Метод | Endpoint | Назначение |
|---|---|---|
| `GET` | `/api/health` | Выполнить тестовый запрос к БД (`SELECT 1`) |
| `GET` | `/api/builds` | Получить сборки и связанные комплектующие |
| `POST` | `/api/orders` | Создать заявку |

Пример тела `POST /api/orders`:

```json
{
  "name": "Иван",
  "phone": "+79990000000",
  "message": "Нужен компьютер для игр",
  "build_id": 1,
  "purpose": "games",
  "performance": "2k",
  "estimated_price": 149900
}
```

В Next.js-обработчике имя должно содержать не менее 2 символов, телефон — не менее 5. Если передан несуществующий `build_id`, он заменяется на `null`. При повторном обращении с тем же телефоном используется найденная запись клиента. Валидация возвращает `422` при некорректных имени или телефоне.

## Начальные данные

Обе реализации содержат механизм начального заполнения пустой базы.

### Статусы

- `new` — Новая
- `accepted` — Принята
- `in_progress` — В сборке
- `done` — Выполнена
- `rejected` — Отклонена

### Категории и комплектующие

| Категория | Примеры |
|---|---|
| Процессор | Ryzen 5 7500F, Ryzen 7 7700, Ryzen 9 7950X3D |
| Видеокарта | GeForce RTX 4060, RTX 4070 Super, RTX 4080 Super |
| Оперативная память | 16, 32 и 64 ГБ DDR5 |
| Накопитель | SSD 1, 2 и 4 ТБ |

### Готовые сборки

| Название | Подпись | Стартовая цена в seed |
|---|---|---:|
| Start | Для Full HD | 89 900 ₽ |
| Flow | Выбор большинства | 149 900 ₽ |
| Ultra | Без компромиссов | 279 900 ₽ |

Начальные цены и состав — демонстрационные данные из seed-файлов. Актуальные цены и наличие необходимо проверять и обновлять через административную панель или напрямую в БД.

## Административная панель

В FastAPI-версии CRM доступна по адресу:

- При Docker-запуске: http://localhost:3000/admin
- При локальном запуске backend без Nginx: http://localhost:8000/admin

Панель предоставляет представления для:

- заявок (`OrderView`);
- клиентов (`ClientView`);
- готовых сборок (`BuildView`);
- состава сборок (`BuildComponentView`);
- комплектующих (`ComponentView`);
- категорий (`Category`);
- статусов (`Status`).

Для заявок предусмотрены массовые действия смены статуса: принять, отправить в сборку, отметить выполненной, отклонить.

Учетные данные задаются через `ADMIN_USERNAME` и `ADMIN_PASSWORD`.

## Проверка и диагностика

### Проверка backend

```bash
curl -i http://localhost:8001/api/health
curl -i http://localhost:8001/api/builds
```

Для Next.js:

```bash
curl -i http://localhost:3000/api/health
curl -i http://localhost:3000/api/builds
```

### Проверка PostgreSQL

```bash
docker compose exec db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Подключиться к БД из контейнера:

```bash
docker compose exec db psql -U kompik -d pc_builds
```

В SQL-консоли:

```sql
\dt
SELECT * FROM statuses;
SELECT * FROM builds;
SELECT * FROM orders ORDER BY created_at DESC;
```

### Частые проблемы

| Проблема | Возможная причина | Что проверить |
|---|---|---|
| Frontend не загружает сборки | Backend недоступен или ошибка БД | `docker compose logs backend db`, `/api/health` |
| Ошибка подключения к PostgreSQL | Неверный DSN, пароль или БД ещё не готова | `DATABASE_URL`, healthcheck контейнера `db` |
| Ошибка авторизации в CRM | Неверные credentials или `SECRET_KEY` | `ADMIN_USERNAME`, `ADMIN_PASSWORD`, логи backend |
| CORS error при локальном запуске | Origin Vite не добавлен в CORS | `CORS_ORIGINS`, адрес frontend |
| Порт уже занят | На машине уже работает сервис на 3000/5050/5432/8001 | Остановить конфликтующий процесс или изменить port mapping |
| После изменения кода изменения не видны в Docker | Контейнер использует старый image | `docker compose up --build -d` |
| В Next.js отсутствует `DATABASE_URL` | Не задано окружение приложения | `.env.local` или переменная окружения процесса |

## Бизнес-процессы

### Создание заявки

```mermaid
flowchart TD
    START(["Пользователь выбирает сборку или конфигуратор"]) --> FORM["Заполняет контактные данные и комментарий"]
    FORM --> SEND["Frontend отправляет POST /api/orders"]
    SEND --> VALID{"Имя и телефон корректны?"}
    VALID -->|Нет| ERROR["Вернуть ошибку валидации"]
    VALID -->|Да| CLIENT{"Клиент с таким телефоном существует?"}
    CLIENT -->|Да| REUSE["Использовать существующего клиента"]
    CLIENT -->|Нет| CREATE["Создать клиента"]
    REUSE --> BUILD{"Передан существующий build_id?"}
    CREATE --> BUILD
    BUILD -->|Да| LINK["Связать заявку со сборкой"]
    BUILD -->|Нет| NO_LINK["Оставить build_id пустым"]
    LINK --> ORDER["Создать заявку со статусом new"]
    NO_LINK --> ORDER
    ORDER --> RESULT["Вернуть ID и статус заявки"]
    RESULT --> END(["Заявка сохранена"])
```

### Жизненный цикл заявки

```mermaid
stateDiagram-v2
    [*] --> new
    new --> accepted: менеджер принимает
    new --> rejected: менеджер отклоняет
    accepted --> in_progress: начало сборки
    in_progress --> done: сборка завершена
```

Диаграмма показывает типовой сценарий работы. В административном интерфейсе предусмотрены действия перевода в перечисленные статусы; строгие ограничения допустимых переходов в бизнес-логике отдельно не реализованы.

## Безопасность и рекомендации для production

Перед публикацией проекта в интернете рекомендуется:

1. Заменить все пароли и `SECRET_KEY` на случайные секреты достаточной длины.
2. Не хранить `.env` и реальные credentials в репозитории.
3. Не использовать значения `admin/admin` и демонстрационные настройки.
4. Настроить HTTPS и безопасные cookie/session-настройки.
5. Ограничить доступ к pgAdmin и административной панели.
6. Настроить резервное копирование PostgreSQL и проверку восстановления.
7. Добавить rate limiting и защиту от массовой отправки заявок.
8. Проверить серверную валидацию всех полей и допустимых значений `purpose` / `performance`.
9. Настроить миграции схемы БД и применять их контролируемо при деплое.
10. Согласовать и оставить одну основную реализацию приложения либо явно разделить сценарии Next.js и FastAPI/Vite.

> В текущем репозитории две реализации имеют похожие схемы, но это отдельные приложения. Если обе подключить к одной базе, изменения схемы и seed-логика должны оставаться совместимыми.

## Скрипты и команды

### Корень репозитория — Next.js

| Команда | Назначение |
|---|---|
| `npm install` | Установить зависимости |
| `npm run dev` | Запустить dev-сервер |
| `npm run build` | Собрать production-версию |
| `npm run start` | Запустить production-сервер |
| `npm run lint` | Запустить ESLint |
| `npm run typecheck` | Проверить TypeScript |

### `frontend/` — Vite

| Команда | Назначение |
|---|---|
| `npm install` | Установить зависимости |
| `npm run dev` | Запустить Vite dev server |
| `npm run build` | Проверить типы и собрать SPA |
| `npm run preview` | Просмотреть production-сборку |

### `backend/` — FastAPI

| Команда | Назначение |
|---|---|
| `pip install -r requirements.txt` | Установить Python-зависимости |
| `uvicorn app.main:app --reload` | Запустить backend в dev-режиме |

---

**Проект:** KOMPIK67  
**Назначение:** подбор, конфигурирование и заказ персональных компьютеров.  
**База данных:** PostgreSQL.  
**Основной Docker entry point:** `docker-compose.yml`.
