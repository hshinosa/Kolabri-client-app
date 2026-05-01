# Kolabri Client App

Frontend for Kolabri, a collaborative learning platform built for research on Socially Shared Regulated Learning (SSRL). Laravel 12 + React 19 + TypeScript.

## Architecture

Laravel acts as a BFF (Backend-for-Frontend) that proxies API calls to the Core API. React pages are rendered via Inertia.js — no separate SPA routing needed.

```
Browser → Laravel (session, CSRF, proxy) → Core API (Express) → AI Engine (FastAPI)
```

### Roles

- **Admin**: manage users, courses, AI providers, view audit logs
- **Lecturer**: create courses/groups, monitor analytics, view intervention data
- **Student**: join groups, chat with peers, use AI assistant, write reflections

## Tech stack

- Laravel 12, PHP 8.3+
- React 19, TypeScript, Tailwind CSS
- Inertia.js (server-driven SPA)
- Vite (dev server + build)
- Socket.IO client (real-time updates)
- Playwright (e2e testing)

## Setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

Configure `.env`:
```
APP_URL=http://localhost:8000
API_BASE_URL=http://localhost:3000
DB_CONNECTION=pgsql
DB_DATABASE=kolabri-db
SESSION_DRIVER=file
```

Run:
```bash
# Terminal 1 - Laravel
php artisan serve

# Terminal 2 - Vite dev server
npm run dev
```

## Testing

```bash
# PHPUnit (feature tests)
./vendor/bin/phpunit

# ESLint
npm run lint

# Playwright e2e (requires all services running)
npm run test:e2e

# Playwright headed mode
npm run test:e2e:headed
```

The e2e tests skip gracefully when backend services are unavailable.

## Build

```bash
npm run build
```

## Project structure

```
app/Http/Controllers/     Laravel controllers (BFF proxy layer)
resources/js/pages/       React pages (admin/, lecturer/, student/, auth/)
resources/js/components/  Shared React components
resources/js/lib/         Utility functions
tests/e2e/               Playwright e2e tests
tests/Feature/           PHPUnit feature tests
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Core API URL (default: http://localhost:3000) |
| `VITE_API_URL` | Frontend API URL for Socket.IO |
| `SESSION_DRIVER` | `file` or `database` |
| `DB_DATABASE` | PostgreSQL database name |

## Related services

- [Kolabri Core API](../Kolabri-core-api) — Express backend, auth, data persistence
- [Kolabri AI Engine](../Kolabri-ai-engine) — FastAPI, RAG, NLP analytics
