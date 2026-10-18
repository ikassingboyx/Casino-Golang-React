# Casino App - Project Structure

```
Casino/
├── frontend/                          # React app (Vite + Tailwind)
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   └── assets/                        # Artwork (git-ignored; only READMEs tracked)
│   │       ├── images/                    # Lobby room + stations, game backgrounds
│   │       ├── cards/                     # Card faces (<suit>-<rank>.svg) + back.svg
│   │       ├── chips/                     # Top-view chips (top-<value>.svg)
│   │       └── roulette/                  # Wheel + betting board SVGs
│   ├── scripts/
│   │   └── casino_art.py                  # Generates the lobby/background SVGs
│   │
│   ├── src/
│   │   ├── main.tsx                       # Entry point
│   │   ├── App.tsx                        # Router setup
│   │   ├── index.css                      # Tailwind + dock button styles
│   │   │
│   │   ├── api/
│   │   │   ├── http.ts                    # Axios instance, base URL, auth + 401 interceptors
│   │   │   ├── ws.ts                      # RoomConnection: joins a room over WS, reconnects, request/ack
│   │   │   ├── auth.ts                    # OAuth login URLs, configured providers
│   │   │   ├── game.ts                    # Offline game: start, action
│   │   │   ├── rooms.ts                   # Create room (5-digit code), look up a code
│   │   │   └── user.ts                    # Get profile, claim the hourly chips
│   │   │
│   │   ├── store/
│   │   │   ├── authStore.ts               # Zustand - user session, token
│   │   │   └── roomStore.ts               # Zustand - the online room + its current round
│   │   │
│   │   ├── hooks/
│   │   │   ├── useRoom.ts                 # useRoom (join/leave a room), useOnlineGame (GameSession over WS)
│   │   │   ├── useOfflineGame.ts          # GameSession over REST; pages play either kind
│   │   │   ├── useCountdown.ts            # Seconds left until a deadline
│   │   │   ├── useElementSize.ts          # Observed size of an element
│   │   │   └── useAuth.ts                 # Auth state + logout
│   │   │
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx              # Google / Facebook / GitHub login
│   │   │   ├── AuthCallbackPage.tsx       # Stores the JWT after social login
│   │   │   ├── LobbyPage.tsx              # Casino interior with clickable game areas
│   │   │   ├── RoomPage.tsx               # /room/:code: waiting room, then the online game
│   │   │   ├── BlackjackPage.tsx          # Blackjack (offline + OnlineBlackjack)
│   │   │   ├── PokerPage.tsx              # Poker (offline + OnlinePoker)
│   │   │   ├── BaccaratPage.tsx           # Baccarat (offline + OnlineBaccarat)
│   │   │   └── RoulettePage.tsx           # Roulette (offline + OnlineRoulette)
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── UserBadge.tsx          # Avatar, name, chips; opens the profile
│   │   │   │   ├── ProfileModal.tsx       # Balance, hourly +3000 chips, log out
│   │   │   │   ├── Modal.tsx              # Generic modal
│   │   │   │   ├── GameShell.tsx          # Game page frame: background, header, dock
│   │   │   │   ├── GameDock.tsx           # Bottom bar: chips, bet, actions
│   │   │   │   ├── TableStage.tsx         # Scales the table to the viewport
│   │   │   │   ├── TableMessage.tsx       # Message printed on the felt
│   │   │   │   ├── FeltPrint.tsx          # Lettering on the felt
│   │   │   │   ├── Card.tsx / CardRow.tsx # Card with flip animation; a row of them
│   │   │   │   ├── Chip.tsx / ChipPile.tsx# A chip; a pile for a bet amount
│   │   │   │   ├── ChipSelector.tsx       # Chip buttons for betting
│   │   │   │   ├── PlayerSeat.tsx         # Player avatar + name + chips at table
│   │   │   │   ├── SeatRing.tsx / seats.ts# Seat layout around a table
│   │   │   │   ├── Shoe.tsx / DiscardTray.tsx
│   │   │   │   ├── DealProvider.tsx / dealing.ts # Dealing animation timing
│   │   │   │   └── tableSize.ts           # Table size context
│   │   │   │
│   │   │   ├── lobby/
│   │   │   │   ├── CasinoInterior.tsx     # The main illustrated casino view
│   │   │   │   ├── GameSpot.tsx           # Clickable area on the casino image
│   │   │   │   └── ModeSelect.tsx         # Offline / online / join-by-code modal
│   │   │   │
│   │   │   ├── blackjack/
│   │   │   │   └── BlackjackTable.tsx     # Table, dealer + player hands
│   │   │   │
│   │   │   ├── poker/
│   │   │   │   ├── PokerTable.tsx         # Table with 5 seats
│   │   │   │   ├── layout.ts              # Seat / chip positions
│   │   │   │   ├── CommunityCards.tsx     # The 5 community cards
│   │   │   │   ├── PlayerHand.tsx         # Player's 2 hole cards
│   │   │   │   ├── PotDisplay.tsx         # Current pot amount
│   │   │   │   └── PokerControls.tsx      # Fold, Call, Raise + slider
│   │   │   │
│   │   │   ├── baccarat/
│   │   │   │   ├── BaccaratTable.tsx      # Table layout
│   │   │   │   ├── BetAreas.tsx           # Player/Banker/Tie bet zones
│   │   │   │   ├── HandDisplay.tsx        # Cards for player/banker
│   │   │   │   └── BeadRoad.tsx           # Result history
│   │   │   │
│   │   │   ├── roulette/
│   │   │   │   ├── RouletteWheel.tsx      # Spinning wheel animation
│   │   │   │   └── BettingBoard.tsx       # Inlined board SVG: click spots, chip piles, winning number
│   │   │   │
│   │   │   └── auth/
│   │   │       └── OAuthButtons.tsx       # Google / Facebook / GitHub buttons
│   │   │
│   │   ├── types/                         # game, poker, blackjack, baccarat, roulette, user, room, ws
│   │   │
│   │   └── utils/
│   │       ├── cardUtils.ts               # Card labels + image paths
│   │       ├── chipUtils.ts               # Chip formatting, denominations, breaking amounts into chips
│   │       ├── tableMessages.ts           # Messages every game shows (waiting, result, out of chips)
│   │       ├── games.ts                   # Game names
│   │       ├── apiError.ts                # Readable API error messages
│   │       ├── returnPath.ts              # Where to go after logging in
│   │       ├── baccarat.ts / poker.ts / roulette.ts # Per-game display helpers
│   │       └── roulettePhysics.ts         # Ball + wheel animation
│   │
│   ├── Dockerfile                     # Build the app, serve it with Caddy
│   ├── Caddyfile                      # Static files, /api + /ws proxy, HTTPS, headers
│   ├── package.json
│   ├── tsconfig*.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                              # Go/Gin server
│   ├── cmd/
│   │   └── server/
│   │       └── main.go                   # Entry point: config, DB, migrations, HTTP server
│   │
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go                 # Env vars, DB URL, JWT secret, OAuth keys, trusted proxies
│   │   │
│   │   ├── models/
│   │   │   ├── user.go                   # User, OAuth login/linking, hourly chip claim
│   │   │   ├── game.go                   # Stored games, chip ledger (ApplyChipChange)
│   │   │   ├── room.go                   # Room, RoomPlayer, rooms table queries
│   │   │   ├── game_state.go             # Player, BaseGameState, Action
│   │   │   ├── poker.go / blackjack.go / baccarat.go / roulette.go  # Per-game state
│   │   │
│   │   ├── handlers/
│   │   │   ├── routes.go                 # All routes + rate limits, GET /api/health
│   │   │   ├── auth.go                   # GET /auth/providers, /auth/:provider, /auth/:provider/callback
│   │   │   ├── user.go                   # GET /users/me, POST /users/me/chips
│   │   │   ├── game.go                   # POST /game/offline/start, /game/offline/action
│   │   │   ├── room.go                   # POST /rooms, GET /rooms/:code
│   │   │   └── ws.go                     # WebSocket upgrade (origin-checked)
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.go                   # JWT validation
│   │   │   ├── cors.go                   # CORS config
│   │   │   ├── logger.go                 # Request log without query strings (keeps tokens out)
│   │   │   └── ratelimit.go              # Per-user / per-IP token bucket
│   │   │
│   │   ├── ws/
│   │   │   ├── hub.go                    # Open rooms by code; creates rooms
│   │   │   ├── client.go                 # Single WS connection wrapper
│   │   │   ├── room.go                   # Online table: seats (max 5), host, round loop, chips, timers
│   │   │   └── messages.go               # WS message type definitions
│   │   │
│   │   ├── game/
│   │   │   ├── engine.go                 # GameEngine interface + shared helpers
│   │   │   ├── poker.go                  # Texas Hold'em: blinds, betting rounds, side pots, showdown
│   │   │   ├── blackjack.go              # Blackjack: deal, hit, stand, double; dealer hits soft 17
│   │   │   ├── baccarat.go               # Punto banco, third card rule
│   │   │   ├── roulette.go               # European single-zero, bet types, payouts
│   │   │   ├── deck.go                   # Deck / shoe (shuffle, draw)
│   │   │   └── hand_eval.go              # Poker hand ranking evaluator
│   │   │
│   │   ├── bot/
│   │   │   ├── engine.go                 # NewEngine: game engine with bots attached
│   │   │   └── poker_bot.go              # Equity-based poker bot (Monte Carlo)
│   │   │
│   │   ├── auth/
│   │   │   ├── jwt.go                    # JWT token generation + validation
│   │   │   ├── oauth.go                  # Configured providers
│   │   │   └── oauth_google.go / oauth_facebook.go / oauth_github.go
│   │   │
│   │   └── db/
│   │       ├── postgres.go               # DB connection + embedded migration runner
│   │       └── migrations/               # 001–009 (*.up.sql / *.down.sql)
│   │
│   ├── Dockerfile                        # Static binary on Alpine, non-root
│   ├── go.mod
│   └── go.sum
│
├── docker-compose.yml                    # postgres + backend + web (Caddy)
├── DOCKER_SPEC.md                        # How to run with Docker and host it
├── .env.example                          # Template for env vars
├── .gitignore
└── README.md
```

## Database Schema (PostgreSQL)

```sql
-- Users table
users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) UNIQUE,   -- NULL if the provider shares none
    display_name    VARCHAR(50) NOT NULL,
    avatar_url      VARCHAR(500),
    chips           BIGINT DEFAULT 1000,   -- Starting chips
    last_chip_claim_at TIMESTAMPTZ,       -- last hourly +3000 chips claim
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
)

-- Social logins (Google / Facebook / GitHub) linked to a user
user_identities (
    id               UUID PRIMARY KEY,
    user_id          UUID REFERENCES users,
    provider         VARCHAR(20) NOT NULL,  -- 'google', 'facebook', 'github'
    provider_user_id VARCHAR(255) NOT NULL,
    created_at       TIMESTAMPTZ,
    UNIQUE (provider, provider_user_id)
)

-- Rooms table
rooms (
    id              UUID PRIMARY KEY,
    code            VARCHAR(8),            -- 5-digit invite code, unique among open rooms
    game_type       VARCHAR(20) NOT NULL,  -- 'poker', 'blackjack', 'baccarat', 'roulette'
    host_id         UUID REFERENCES users,
    status          VARCHAR(20),           -- 'waiting', 'playing', 'finished'
    settings        JSONB,                 -- { bigBlind: 100, maxPlayers: 5, ... }
    created_at      TIMESTAMP
)

-- Games table (history + active state)
games (
    id              UUID PRIMARY KEY,
    room_id         UUID REFERENCES rooms,
    game_type       VARCHAR(20) NOT NULL,
    state           JSONB NOT NULL,        -- The full GameState object
    is_offline      BOOLEAN DEFAULT FALSE,
    status          VARCHAR(20),           -- 'active', 'completed'
    started_at      TIMESTAMP,
    finished_at     TIMESTAMP
)

-- Chip transactions (ledger)
chip_transactions (
    id              UUID PRIMARY KEY,
    user_id         UUID REFERENCES users,
    game_id         UUID REFERENCES games,
    amount          BIGINT NOT NULL,       -- Positive = win, negative = loss
    balance_after   BIGINT NOT NULL,
    description     VARCHAR(255),
    created_at      TIMESTAMP
)
```

## GameState Object (the core concept)

```json
{
    "gameId": "uuid",
    "gameType": "poker",
    "phase": "flop",
    "players": [
        {
            "id": "uuid",
            "name": "Player1",
            "chips": 5000,
            "bet": 200,
            "cards": [{"suit": "hearts", "rank": "A"}, {"suit": "spades", "rank": "K"}],
            "isBot": false,
            "isActive": true,
            "isFolded": false
        }
    ],
    "communityCards": [...],
    "pot": 800,
    "currentTurn": 2,
    "dealer": 0,
    "bigBlind": 100,
    "smallBlind": 50,
    "lastAction": { "playerId": "uuid", "action": "raise", "amount": 200 },
    "winners": null
}
```

## Data Flow

```
                    OFFLINE MODE
    ┌──────────────────────────────────────┐
    │  React App                           │
    │                                      │
    │  GameState lives in the games table  │
    │  Bot logic runs in backend via REST  │
    │                                      │
    │  POST /api/game/offline/start        │
    │    → returns initial GameState       │
    │  POST /api/game/offline/action       │
    │    → { action: "hit" }               │
    │    ← returns updated GameState       │
    │       (includes bot moves)           │
    └──────────────────────────────────────┘

                    ONLINE MODE
    ┌──────────────────────────────────────┐
    │  React App                           │
    │                                      │
    │  1. Lobby → pick a table → "Online"  │
    │     POST /api/rooms { gameType }     │
    │     → { code: "48213" }              │
    │                                      │
    │  2. Everyone opens /room/48213       │
    │     (the invite link, or the code    │
    │      typed into the lobby modal)     │
    │     → WS /ws?token=…&code=48213      │
    │       connecting = joining (max 5)   │
    │     ← room_state to everyone         │
    │                                      │
    │  3. Host clicks "Start game"         │
    │     → { type: "start_game", id }     │
    │                                      │
    │  4. Server deals a round             │
    │     ← game_state to each player      │
    │       (their own view: hidden cards  │
    │        filtered, their balance,      │
    │        timeLeft on the clock)        │
    │                                      │
    │  5. Player acts                      │
    │     → { type: "player_action", id,   │
    │         data: { action: "raise",     │
    │                 amount: 500 } }      │
    │     ← game_state to everyone, then   │
    │       ack { id, error? } to sender   │
    │                                      │
    │  6. Bets wait for the whole table    │
    │     (20s clock once someone bets);   │
    │     turns time out after 30s.        │
    │     Round over → chips settled →     │
    │     next round dealt automatically.  │
    └──────────────────────────────────────┘
```
