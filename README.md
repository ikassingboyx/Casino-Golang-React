Szymon Oblacinski
WdAI Poniedzialek 13:15-14:45

Dowloand project
Build:
    docker compose up -d --build
Separetly:
    Frontend:
        cd frontend && npm install && npm run dev   # app on :5173
    backend:
        cd backend && go run ./cmd/server    # API on :8080 (needs a local Postgres)

Github: https://github.com/ikassingboyx/Casino-Golang-React