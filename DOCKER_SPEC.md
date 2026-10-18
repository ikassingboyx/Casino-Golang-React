# Running the Casino with Docker

One command starts everything:

```sh
docker compose up -d --build
```

Then open **http://localhost**.

This guide covers the first-time setup, the commands you'll use every day, and
how to host the site on a server (section 5).

---

## 1. What runs

```
                 browser
                    │  http://localhost  (or https://your-domain)
                    ▼
   ┌──────────────────────────────────┐
   │ web  (Caddy)          ports 80/443│  serves the built React app
   │   /api/*  ─┐                      │  /api and /ws → backend
   │   /ws     ─┤                      │  HTTPS certificates (when hosted)
   └────────────┼─────────────────────┘
                ▼
   ┌──────────────────────────────────┐
   │ backend  (Go)          port 8080  │  REST API, WebSocket rooms, game engines
   │                    (internal only)│  runs database migrations on start
   └────────────┬─────────────────────┘
                ▼
   ┌──────────────────────────────────┐
   │ postgres  (16)         port 5432  │  users, games, chip ledger
   │                    (internal only)│  data kept in the postgres_data volume
   └──────────────────────────────────┘
```

- The app, the API and the WebSocket share **one address**, so there is no
  CORS setup and hosting needs one domain and one certificate.
- Only `web` can be reached from outside. The backend and database are only
  on Docker's internal network.

| File | What it is |
|---|---|
| [docker-compose.yml](docker-compose.yml) | The three services, volumes, health checks, log rotation |
| [backend/Dockerfile](backend/Dockerfile) | Builds a static Go binary; runs as a non-root user on Alpine |
| [frontend/Dockerfile](frontend/Dockerfile) | Builds the React app, then packs it into a Caddy image |
| [frontend/Caddyfile](frontend/Caddyfile) | Static files, `/api` + `/ws` proxy, caching, security headers, HTTPS |
| [.env.example](.env.example) | Every setting, with explanations; copy to `.env` |
| `backend/.dockerignore`, `frontend/.dockerignore` | Keep `.env`, `node_modules`, builds out of the images |

---

## 2. First-time setup

### 2.1 Install Docker

- **Mac / Windows:** install Docker Desktop and start it.
- **Linux:** install Docker Engine with the Compose plugin.

Check that it works: `docker compose version` should print v2.x.

### 2.2 Artwork

The card, chip, table and lobby artwork in `frontend/public/assets/` is
**git-ignored**; only the README files are committed. A fresh clone therefore
has no artwork, and the frontend build stops with:

```
Missing public/assets/cards/back.svg - copy the artwork into frontend/public/assets
```

On the machine where you develop, the artwork is already there and nothing
needs doing. On any other machine (a server, a new laptop), copy the folder
over first. Section 5.3 covers this for hosting.

### 2.3 Settings (`.env`)

```sh
cp .env.example .env      # skip if you already have a .env
```

The required values:

| Setting | How to get it |
|---|---|
| `JWT_SECRET` | `openssl rand -base64 48` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` (letters and digits only, because it goes into a URL) |
| `GOOGLE_*`, `GITHUB_*`, `FACEBOOK_*` | From each provider's developer console. Set at least one, or nobody can log in. |

For a local Docker run, keep `PUBLIC_URL=http://localhost` and
`SITE_ADDRESS=:80`.

### 2.4 OAuth redirect URIs

Each provider only sends users back to addresses you have registered. For the
Docker setup, add:

```
http://localhost/api/auth/google/callback
http://localhost/api/auth/github/callback
http://localhost/api/auth/facebook/callback
```

The pattern is `<PUBLIC_URL>/api/auth/<provider>/callback`. Keep your existing
`http://localhost:8080/...` URIs for local development; providers accept
several. Where to set them:

- **Google:** Cloud Console → APIs & Services → Credentials → your OAuth client
  → *Authorized redirect URIs*.
- **GitHub:** Settings → Developer settings → OAuth Apps → your app →
  *Authorization callback URL*. GitHub allows only one per app, so create a
  second app for Docker or hosting.
- **Facebook:** your app → Facebook Login → Settings → *Valid OAuth Redirect
  URIs*.

### 2.5 Start

```sh
docker compose up -d --build
```

The first build takes a few minutes; later ones are much faster thanks to
caching. When `docker compose ps` shows all three services as **healthy**,
open http://localhost and log in.

---

## 3. Everyday commands

Run these from the repo root.

| Task | Command |
|---|---|
| Start (and rebuild after code changes) | `docker compose up -d --build` |
| Status and health | `docker compose ps` |
| Logs, all services / one service | `docker compose logs -f` / `docker compose logs -f backend` |
| Stop (data is kept) | `docker compose down` |
| Restart one service | `docker compose restart backend` |
| Database shell | `docker compose exec postgres psql -U casino casino_db` |
| Back up the database | `docker compose exec -T postgres pg_dump -U casino casino_db > backup.sql` |
| Restore a backup | `docker compose exec -T postgres psql -U casino casino_db < backup.sql` |
| Health check | `curl http://localhost/api/health` → `{"status":"ok"}` |
| **Wipe everything**, including all users and chips | `docker compose down -v` |

Notes:

- Database migrations run automatically every time the backend starts.
- Online rooms live in the backend's memory. Restarting the backend ends open
  tables, and players simply open a new room. Offline games and all chip
  balances are stored in the database and survive restarts.
- Logs rotate at 10 MB × 3 files per service, so they never fill the disk.

---

## 4. Configuration reference

All settings are read from `.env`. [docker-compose.yml](docker-compose.yml)
passes them to the containers.

| Setting | Default | Meaning |
|---|---|---|
| `PUBLIC_URL` | `http://localhost` | The address people open. The backend builds OAuth callbacks from it and only accepts WebSocket connections from it. Change it whenever the address changes. |
| `SITE_ADDRESS` | `:80` | What Caddy listens for. `:80` means plain HTTP. A bare domain (`casino.example.com`) means automatic HTTPS for that domain. |
| `HTTP_PORT` / `HTTPS_PORT` | `80` / `443` | Host ports for the web container |
| `POSTGRES_PASSWORD` | (required) | Database password. Applied only when the database is first created; see Troubleshooting. |
| `JWT_SECRET` | (required) | Signs login tokens. At least 32 characters. Changing it logs everyone out. |
| `JWT_EXPIRY` | `168h` | How long a login lasts (7 days) |
| `GOOGLE_/GITHUB_/FACEBOOK_CLIENT_ID` + `_SECRET` | empty | A provider appears on the login page when its client ID is set |
| `IMAGE_PREFIX` / `IMAGE_TAG` | `casino` / `latest` | Image names, for pushing to a registry (section 5.3, option B) |

The backend in Docker always runs with `GIN_MODE=release`. The
local-development settings (`API_URL`, `FRONTEND_URL`, `DATABASE_URL`, `PORT`)
are ignored by Docker, so one `.env` serves both.

### Running on a different port locally

If port 80 is taken, set `HTTP_PORT=8000` and `PUBLIC_URL=http://localhost:8000`,
then register `http://localhost:8000/api/auth/<provider>/callback` with the
providers.

### Local development without Docker (unchanged)

```sh
cd backend && go run ./cmd/server      # API on :8080, uses your local Postgres
cd frontend && npm run dev             # app on :5173
```

Vite now proxies `/api` and `/ws` to `localhost:8080`, the same way Caddy does
in Docker, so the frontend has no URLs to configure.

---

## 5. Hosting (next step)

The images are already production-ready: HTTPS, security headers, non-root
containers, health checks, restart policies, log rotation, and an internal-only
database. Hosting comes down to a server, a domain, and a few `.env` values.

### 5.1 You need

- A Linux server (VPS) with Docker installed. 1 vCPU and 1–2 GB RAM is plenty
  to start. The poker bots are the only CPU-heavy part.
- A domain or subdomain, e.g. `casino.example.com`.

### 5.2 DNS and firewall

- Create an **A record** pointing `casino.example.com` at the server's IP (plus
  AAAA if it has IPv6).
- Open ports **80** and **443** (TCP, plus UDP 443 for HTTP/3) in the server
  firewall or the provider's security group. Keep 5432 and 8080 closed; they
  aren't published anyway.

### 5.3 Get the app onto the server

**Option A: build on the server (simplest).**

```sh
git clone <your repo> casino && cd casino
# from your machine, copy the git-ignored artwork:
rsync -a frontend/public/assets/ user@server:casino/frontend/public/assets/
```

**Option B: build locally, push images to a registry.**
The server then needs neither the source nor the artwork. Set
`IMAGE_PREFIX=ghcr.io/<you>/casino` in `.env`, then run
`docker compose build && docker compose push` locally. On the server, keep
only `docker-compose.yml` and `.env`, and run `docker compose pull && docker compose up -d`.

**Option C: commit the artwork.** It's about 700 KB. Remove the
`frontend/public/assets/**` lines from `.gitignore` if you're free to publish
it; a clone then builds as-is.

### 5.4 Production `.env`

On the server, create `.env` from `.env.example`. Use **new** secrets, not the
ones from your laptop:

```env
PUBLIC_URL=https://casino.example.com
SITE_ADDRESS=casino.example.com
HTTP_PORT=80
HTTPS_PORT=443
POSTGRES_PASSWORD=<openssl rand -hex 24>
JWT_SECRET=<openssl rand -base64 48>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# GitHub / Facebook likewise
```

Lock it down with `chmod 600 .env`.

### 5.5 OAuth for the domain

Register `https://casino.example.com/api/auth/<provider>/callback` with each
provider (section 2.4). Facebook also needs the domain under *App Domains*, and
the app switched to **Live** mode; in development mode only test users can log
in.

### 5.6 Start and verify

```sh
docker compose up -d --build
docker compose ps                                  # all healthy
curl https://casino.example.com/api/health         # {"status":"ok"}
docker compose logs web | grep -i certificate      # Caddy obtained the certificate
```

Caddy gets the Let's Encrypt certificate on first start, renews it
automatically, and redirects HTTP to HTTPS. Certificates are stored in the
`caddy_data` volume; don't delete it, or Caddy has to request them again
(Let's Encrypt rate-limits repeated requests).

### 5.7 Updating

```sh
git pull                        # option A; for option B: docker compose pull
docker compose up -d --build
```

Players at online tables are disconnected for a few seconds; balances and
offline games are kept.

### 5.8 Backups

Schedule a daily dump on the server (`crontab -e`):

```cron
0 4 * * * cd /home/user/casino && docker compose exec -T postgres pg_dump -U casino casino_db | gzip > backups/casino-$(date +\%F).sql.gz
```

Copy the backups off the server now and then.

### 5.9 Hosting on a platform instead of a VPS

On platforms that terminate HTTPS themselves and route to one container port
(Render, Fly.io, Railway, a cloud load balancer):

- Set `SITE_ADDRESS=:80` and route the platform's HTTPS traffic to the `web`
  container's port 80. Set `PUBLIC_URL` to the platform's `https://` address.
- Use the platform's managed Postgres if you like: drop the `postgres` service
  and set the backend's `DATABASE_URL` to the provided URL. Add
  `sslmode=require` if the platform requires TLS.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `set POSTGRES_PASSWORD in .env` or `set JWT_SECRET in .env` | Required setting missing from `.env` |
| Build fails: `Missing public/assets/...` | Artwork not copied (section 2.2) |
| `port is already allocated` on 80/443 | Something else uses the port. Stop it, or change `HTTP_PORT` (section 4). |
| Backend restarts with `password authentication failed` | `POSTGRES_PASSWORD` changed after the database was created. Change it back. Or, if the data doesn't matter, run `docker compose down -v` to recreate the database. |
| Login page shows no buttons | No OAuth client IDs in `.env` |
| `redirect_uri_mismatch` / "URL blocked" at the provider | The callback URI isn't registered, or `PUBLIC_URL` is wrong (section 2.4) |
| Online room: "connecting…" forever | You opened the site at a different address than `PUBLIC_URL` (e.g. `127.0.0.1` vs `localhost`); WebSockets are only accepted from `PUBLIC_URL` |
| No HTTPS certificate when hosted | DNS doesn't point at the server yet, or ports 80/443 are closed. Check `docker compose logs web`. |
| `429 too many requests` | Rate limit: 10 req/s per user, 20 per IP before login, a few new rooms per minute. Normal play stays well below this. |

---

## 7. Security notes

- `.env` holds every secret. It is git-ignored and kept out of both images by
  the `.dockerignore` files. Never commit it or bake it into an image.
- Neither the backend nor Caddy logs URLs with query strings, because the
  WebSocket URL carries the login token.
- The containers run as non-root (backend) or with a minimal image (Caddy).
  Postgres is never published.
- Caddy sends HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy and
  Permissions-Policy headers.
