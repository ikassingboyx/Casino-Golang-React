# Casino-Golang-React

Blackjack, Texas Hold'em, baccarat and roulette, offline against the house and
bots or online with friends at tables of up to five. Go (Gin) backend,
React frontend, PostgreSQL.

## Run it

```sh
cp .env.example .env    # fill in JWT_SECRET, POSTGRES_PASSWORD, OAuth keys
docker compose up -d --build
```

Open http://localhost. Setup, everyday commands and hosting:
[DOCKER_SPEC.md](DOCKER_SPEC.md).

## Develop

```sh
cd backend && go run ./cmd/server    # API on :8080 (needs a local Postgres)
cd frontend && npm install && npm run dev   # app on :5173
```

- [SPEC.md](SPEC.md): game rules, WebSocket protocol, API
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md): where everything lives
