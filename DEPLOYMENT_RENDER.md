# Deploying Glyph to Render

Railway trial paused? Run the backend on [Render](https://render.com). Keep the Next.js frontend on **Vercel**.

```
[ Vercel: Next.js ] ──HTTP/WS──> [ Render: glyph-api ]
                                        │
                                  (also polls compile queue
                                   + runs latexmk in-process)
                                        │
                                  [ glyph-db Postgres ]
```

There is **no separate compile worker**. The API image includes TeX Live + `latexmk` and runs the job poller inside the same process.

## What’s in `render.yaml`

| Resource | Type | Notes |
|---|---|---|
| `glyph-db` | Postgres (`free`) | App data + compile job queue |
| `glyph-api` | Web (Docker `server/Dockerfile`) | REST, Yjs WebSockets, **and** LaTeX compile |

Optional: `server/Dockerfile.worker` still exists if you later want a dedicated worker.

## Current provisioned resources

| Resource | Dashboard |
|---|---|
| Postgres `glyph-db` | https://dashboard.render.com/d/dpg-d997rj0k1i2s73dq0t4g-a |
| Web `glyph-api` | https://dashboard.render.com/web/srv-d997rkucjfls73fs4r30 |

API URL: **https://glyph-api-df89.onrender.com**

## 1. Deploy the API

`glyph-api` auto-deploys from `main`. After TeX-in-API changes:

```bash
render deploys create srv-d997rkucjfls73fs4r30 --confirm
```

First build installs TeX packages — expect a longer Docker build.

## 2. Point the frontend at the API

In **Vercel** env vars:

```
NEXT_PUBLIC_API_URL=https://glyph-api-df89.onrender.com
# optional:
# NEXT_PUBLIC_WS_URL=wss://glyph-api-df89.onrender.com
```

Redeploy the frontend so `NEXT_PUBLIC_*` values are baked in.

## 3. Clerk allowlists

Add:

- Your Vercel frontend origin
- `https://glyph-api-df89.onrender.com`

## 4. Verify

```bash
curl https://glyph-api-df89.onrender.com/
# → Backend is running!
```

Then open the app and hit **Compile** — the API should pick up the queued job.

## Notes

- Free web services **spin down** when idle; first request / compile after sleep is slow.
- The TeX scheme is medium (`latex-extra` + `science`, not `texlive-full`). Exotic packages may need Dockerfile additions.
- Set `DISABLE_INLINE_COMPILER=true` only if you run a standalone worker again.
- Render injects `PORT`; the API binds `0.0.0.0:$PORT`.
