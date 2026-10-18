# syntax=docker/dockerfile:1

# ---- build: a static binary (migrations are embedded in it)
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- run: small image, non-root user
FROM alpine:3.22
# ca-certificates: HTTPS calls to the OAuth providers; wget (busybox): healthcheck
RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -H -u 10001 casino
COPY --from=build /out/server /usr/local/bin/server
USER casino
ENV GIN_MODE=release PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
ENTRYPOINT ["/usr/local/bin/server"]
