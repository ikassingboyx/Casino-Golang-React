# syntax=docker/dockerfile:1

# ---- build: the static app (dist/)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The artwork in public/assets is git-ignored, so a fresh clone has none.
# Fail here rather than ship a casino without cards.
RUN for f in cards/back.svg chips/top-25.svg images/lobby-room.svg roulette/roulette-board.svg; do \
      [ -f "public/assets/$f" ] || { echo "Missing public/assets/$f - copy the artwork into frontend/public/assets (see DOCKER_SPEC.md)"; exit 1; }; \
    done
RUN npm run build

# ---- run: Caddy serves the app and proxies /api and /ws to the backend.
# It gets and renews HTTPS certificates itself when SITE_ADDRESS is a domain.
FROM caddy:2.10-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
