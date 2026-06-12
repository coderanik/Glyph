# 🚀 Deploying Glyph to Railway

This guide outlines the steps required to deploy the complete **Glyph** stack (PostgreSQL, Hono API, Compile Worker, and Next.js Frontend) to [Railway](https://railway.app).

---

## 🏗️ Deployment Architecture on Railway

Glyph is structured as an npm-workspace monorepo. On Railway, we deploy **three independent services** pointing to the same GitHub repository, along with a managed **PostgreSQL** database service:

```
[ Next.js Frontend ] ──(HTTP/WS)──> [ Hono API Server ]
                                          │
                                    (Reads/Writes)
                                          │
                                          ▼
[ Compile Worker ] ◄──(Queue Poll)── [ PostgreSQL ]
```

---

## 1. Provision a PostgreSQL Database

1. In your Railway Project canvas, click **New** -> **Database** -> **Add PostgreSQL**.
2. Railway will provision a PostgreSQL instance and automatically expose the connection variables (e.g., `DATABASE_URL`).

---

## 2. Deploy the Hono API Server

This service handles REST API requests and Yjs WebSocket collaboration rooms.

1. Click **New** -> **GitHub Repo** -> select your fork/clone of `Glyph`.
2. Rename the service to `glyph-api`.
3. Go to **Settings** -> **Build** and configure:
   - **Root Directory**: `/` (Leave as root so it has access to the workspace configuration)
   - **Dockerfile Path**: `server/Dockerfile`
4. Go to **Variables** and add:
   - `PORT`: `8083` (Railway will automatically bind to its internal port, but exposing `PORT=8083` matches the default)
   - `DATABASE_URL`: `${{ Postgres.DATABASE_URL }}` (Click **Add Reference** to link the Railway PostgreSQL service)
   - `CLERK_PUBLISHABLE_KEY`: *(Your Clerk Publishable Key)*
   - `CLERK_SECRET_KEY`: *(Your Clerk Secret Key)*
   - `GEMINI_API_KEY`: *(Your Google AI Studio Gemini API Key)*
   - `FRONTEND_URL`: `https://your-frontend-domain.railway.app` (The URL of your Next.js service, configure this after step 4)

---

## 3. Deploy the Compile Worker

This worker polls the database queue and compiles LaTeX documents using TeX Live.

1. Click **New** -> **GitHub Repo** -> select your `Glyph` repository.
2. Rename the service to `glyph-worker`.
3. Go to **Settings** -> **Build** and configure:
   - **Root Directory**: `/`
   - **Dockerfile Path**: `server/Dockerfile.worker`
4. Go to **Variables** and add:
   - `DATABASE_URL`: `${{ Postgres.DATABASE_URL }}` (Links the PostgreSQL service)
   - `NODE_ENV`: `production`

> [!NOTE]
> The Compile Worker container is built using `node:20-bookworm-slim` and installs the full TeX Live suite (`texlive-full`, `latexmk`, `biber`). It runs compilations directly inside the container without needing Docker-in-Docker.

---

## 4. Deploy the Next.js Frontend

1. Click **New** -> **GitHub Repo** -> select your `Glyph` repository.
2. Rename the service to `glyph-frontend`.
3. Go to **Settings** -> **Build** and configure:
   - **Root Directory**: `/`
   - **Dockerfile Path**: `frontend/Dockerfile`
4. Go to **Variables** and add:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: *(Your Clerk Publishable Key)*
   - `CLERK_SECRET_KEY`: *(Your Clerk Secret Key)*
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: `/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: `/sign-up`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`: `/dashboard`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`: `/dashboard`
   - `NEXT_PUBLIC_API_URL`: `https://your-api-domain.railway.app` (The URL of your `glyph-api` service, e.g. `${{ glyph-api.RAILWAY_PUBLIC_DOMAIN }}`)

> [!IMPORTANT]
> Next.js bakes environment variables starting with `NEXT_PUBLIC_` into the static client bundles during build time. Because Railway passes all configured variables to the Docker build context as `--build-arg`, they will be successfully compiled into your application. Make sure these variables are defined in the dashboard **before** triggering a deployment build.

---

## ⚙️ Summary of Environment Variables

| Variable Name | Required By | Description | Example / Reference |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | API, Worker | PostgreSQL connection string | `${{ Postgres.DATABASE_URL }}` |
| `NEXT_PUBLIC_API_URL` | Frontend | Public URL of the Hono API server | `https://glyph-api.up.railway.app` |
| `FRONTEND_URL` | API | Allowed origin for CORS | `https://glyph-frontend.up.railway.app` |
| `CLERK_SECRET_KEY` | API, Frontend | Authentication secret key | `sk_test_...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | API, Frontend | Public authentication key | `pk_test_...` |
| `GEMINI_API_KEY` | API | Gemini LLM integration key | `AIzaSy...` |
