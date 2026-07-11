# Deploying Glyph to Render

Railway trial paused? Run the backend stack on [Render](https://render.com). Keep the Next.js frontend on **Vercel**.

```
[ Vercel: Next.js ] ──HTTP/WS──> [ Render: glyph-api ]
                                        │
                                  [ glyph-db Postgres ]
                                        │
                              [ glyph-worker / latexmk ]
```

## What’s in `render.yaml`

| Resource | Type | Notes |
|---|---|---|
| `glyph-db` | Postgres (`free`) | Shared by API (+ worker when enabled) |
| `glyph-api` | Web (Docker `server/Dockerfile`) | REST + Yjs WebSockets — live at `https://glyph-api-df89.onrender.com` |

### Compile worker (paid)

`glyph-worker` needs a **Starter** (or higher) background worker with `server/Dockerfile.worker` (`texlive-full`). Render returns `need_payment_info` on free accounts — add a payment method, then create the worker from the Dashboard or re-add it to `render.yaml`.

Frontend is **not** on Render — use Vercel (`frontend/vercel.json`).

## Current provisioned resources

| Resource | Dashboard |
|---|---|
| Postgres `glyph-db` | https://dashboard.render.com/d/dpg-d997rj0k1i2s73dq0t4g-a |
| Web `glyph-api` | https://dashboard.render.com/web/srv-d997rkucjfls73fs4r30 |

## 1. Push & deploy the API

`glyph-api` is already linked to `main` with auto-deploy. Push Docker/env fixes, then:

```bash
render deploys create srv-d997rkucjfls73fs4r30 --confirm
```

Or use [New → Blueprint](https://dashboard.render.com/blueprints/new) with `render.yaml` for greenfield setups.

## 2. Point the frontend at the API

In the **Vercel** project env vars:

```
NEXT_PUBLIC_API_URL=https://glyph-api-df89.onrender.com
# optional:
# NEXT_PUBLIC_WS_URL=wss://glyph-api-df89.onrender.com
```

Redeploy the frontend so `NEXT_PUBLIC_*` values are baked in.

## 3. Clerk allowlists

In the Clerk dashboard, add:

- Vercel frontend origin
- `https://glyph-api-df89.onrender.com`

## 4. Verify

```bash
curl https://glyph-api-df89.onrender.com/
# → Backend is running!
```

Then open the Vercel app. Compiles need `glyph-worker` Live (see paid note above).

## Notes

- **Free web** services spin down after idle — first request / WebSocket reconnect can be slow.
- **Worker image** installs `texlive-full` — first Docker build is large/slow; needs a paid worker plan.
- `DB_SSL` is set; `server/src/config/db.ts` also detects `render.com` hostnames.
- Render injects `PORT` automatically — the API binds `0.0.0.0:$PORT`.
