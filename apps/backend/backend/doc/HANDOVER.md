# Project Handover Guide – Tourism Backend & ML Service

This document explains how to run, configure, and hand over the project (Node.js backend + FastAPI ML service + PostgreSQL).

## 1) Prerequisites
- Docker & Docker Compose installed
- Ports available on host:
  - 3000 (backend HTTP)
  - 8000 (ML service HTTP)
  - 5434 (Postgres exposed port; internal service uses 5432)

## 2) Run the stack (dev / hot-reload)
From `backend/`:
```bash
cd backend
docker compose up -d --build
```

What starts:
- `backend` (Node.js, `http://localhost:3000`)
- `ml` (FastAPI, `http://localhost:8000`)
- `db` (Postgres, exposed at `localhost:5434`, service name `db`)

Hot reload:
- Backend: source mounted, runs `tsx watch`; editing `backend/src/**` auto-reloads.
- ML: source mounted, runs `uvicorn --reload`; editing `ml/app/**` auto-reloads.

Stop:
```bash
docker compose down
```
Reset DB (drops data):
```bash
docker compose down -v
```

## 3) Environment configuration
Create `backend/.env` (key variables):
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@db:5432/adama_tourism?schema=public

ML_SERVICE_URL=http://ml:8000
ML_SECRET=your_ml_secret_here

JWT_SECRET=...
JWT_EXPIRES_IN=900s
REFRESH_TOKEN_SECRET=...
REFRESH_TOKEN_EXPIRES_IN=30d

BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Payments (Chapa)
CHAPA_SECRET_KEY=your_chapa_key
CHAPA_INIT_URL=https://api.chapa.co/v1/transaction/initialize
CHAPA_VERIFY_URL=https://api.chapa.co/v1/transaction/verify
CHAPA_CALLBACK_PATH=/api/payments/webhook
CHAPA_RETURN_URL=/payments/return
CHAPA_WEBHOOK_SECRET=your_webhook_secret
CHAPA_WEBHOOK_HEADER=x-chapa-signature

# Uploads
UPLOAD_DRIVER=local
UPLOAD_LOCAL_PATH=./uploads

# Cloudinary (if using cloud uploads)
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_CLOUD_NAME=...

# Gemini / ML
GEMINI_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-pro
CHAT_MEMORY_MESSAGES=20
```

Create `ml/.env`:
```
EXPRESS_ML_URL=http://backend:3000
ML_SECRET=your_ml_secret_here
```

## 4) Database & migrations
- Service `db` is internal hostname `db` (port 5432). Host access via `localhost:5434`.
- Apply migrations (after containers up):
```bash
docker compose exec backend npm run db:deploy   # uses prisma migrate deploy
```
- Regenerate Prisma client after schema changes:
```bash
docker compose exec backend npm run db:generate
```

## 5) API docs
- Swagger UI: `http://localhost:3000/api-docs`
- Base path for requests: `http://localhost:3000/api`
- Swagger For Ml Training:`http://localhost:8000/docs`


## 6) Payments (Chapa) – important
- `CHAPA_CALLBACK_PATH` points to the webhook handler: `/api/payments/webhook`
- You must register a publicly reachable URL in the Chapa dashboard, e.g.:
  - `https://your-domain.com/api/payments/webhook`
  - For testing, use ngrok and set that URL in Chapa dashboard.
- `CHAPA_WEBHOOK_SECRET` must match the secret configured in Chapa; requests are validated via the `x-chapa-signature` header.
- Return URL (`CHAPA_RETURN_URL`) is where users are redirected after payment; set it to your frontend route.
- Init and verify endpoints use `CHAPA_INIT_URL` and `CHAPA_VERIFY_URL` (defaults already set to Chapa API).

## 7) ML service
- Public dev URL: `http://localhost:8000`
- Backend calls ML via internal URL `http://ml:8000`
- ML uses `ML_SECRET` (shared with backend) when needed.

## 8) Common admin tasks
- View logs:
```bash
docker compose logs -f backend
docker compose logs -f ml
docker compose logs -f db
```
- Restart a service:
```bash
docker compose restart backend
docker compose restart ml
```
- Enter a shell:
```bash
docker compose exec backend sh
docker compose exec ml bash
docker compose exec db psql -U postgres -d adama_tourism
```

## 9) Production notes (brief)
- Provide production-ready envs (strong secrets, real Chapa keys, real domains).
- Consider disabling hot-reload: change backend command to `npx tsx src/server.ts` (no `watch`) and remove source volume mounts; same for ML remove `--reload`.
- Use managed Postgres or secure the exposed port; adjust compose port mapping if needed.

## 10) Endpoints needing external setup
- Chapa webhook: must be registered in Chapa dashboard pointing to `/api/payments/webhook`.
- Chapa return URL: must be configured to your frontend route for post-payment UX.
- Cloudinary (if used): ensure keys and allowed upload presets are configured.

## 11) Troubleshooting quick list
- Port conflict on DB: compose maps DB to host `5434`; ensure it’s free.
- Backend cannot reach DB: confirm `DATABASE_URL` host is `db` (not localhost) inside containers.
- Backend cannot reach ML: confirm `ML_SERVICE_URL=http://ml:8000`.
- Changes not reloading: ensure containers are up; source mounts exist; watch mode logs should show reloads.


