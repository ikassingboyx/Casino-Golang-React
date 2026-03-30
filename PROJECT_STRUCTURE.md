# Casino App - Project Structure

```
Casino/
├── frontend/                          # React app
│   ├── public/
│   │   ├── index.html
│   │   └── assets/
│   │       ├── images/
│   │       │   ├── casino-interior.png    # Main lobby background
│   │       │   ├── blackjack-table.png    # Game spot in lobby
│   │       │   ├── poker-table.png
│   │       │   ├── baccarat-table.png
│   │       │   └── roulette-table.png
│   │       ├── cards/                     # Card face SVGs (52 cards + back)
│   │       └── chips/                     # Chip SVGs (different values)
│   │
│   ├── src/
│   │   ├── main.tsx                       # Entry point
│   │   ├── App.tsx                        # Router setup
│   │   │
│   │   ├── api/
│   │   │   ├── http.ts                    # Axios/fetch instance, base URL, interceptors
│   │   │   ├── ws.ts                      # WebSocket client (connect, send, subscribe)
│   │   │   ├── auth.ts                    # login, register, oauth endpoints
│   │   │   ├── rooms.ts                   # create room, join room, list rooms
│   │   │   └── user.ts                    # get profile, get chips, update profile
│   │   │
│   │   ├── store/
│   │   │   ├── authStore.ts               # Zustand - user session, token
│   │   │   ├── gameStore.ts               # Zustand - current GameState object
│   │   │   ├── lobbyStore.ts              # Zustand - room list, lobby state
│   │   │   └── chipStore.ts               # Zustand - chip balance, transactions
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts            # Hook to manage WS connection lifecycle
│   │   │   ├── useGameState.ts            # Hook to sync GameState from WS
│   │   │   └── useAuth.ts                 # Hook for auth state + redirects
│   │   │
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx              # Email/Gmail/Facebook login
│   │   │   ├── RegisterPage.tsx           # Registration form
│   │   │   ├── LobbyPage.tsx             # Casino interior with clickable game areas
│   │   │   ├── GameSelectPage.tsx         # After clicking game: offline vs online choice
│   │   │   ├── RoomPage.tsx               # Waiting room before game starts (online)
│   │   │   ├── BlackjackPage.tsx          # Blackjack game view
│   │   │   ├── PokerPage.tsx              # Poker game view
│   │   │   ├── BaccaratPage.tsx           # Baccarat game view
│   │   │   ├── RoulettePage.tsx           # Roulette game view
│   │   │   └── ProfilePage.tsx            # User stats, chip balance
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Card.tsx               # Single card with flip animation
│   │   │   │   ├── Chip.tsx               # Chip with value display
│   │   │   │   ├── ChipStack.tsx          # Stack of chips (for bets)
│   │   │   │   ├── PlayerSeat.tsx         # Player avatar + name + chips at table
│   │   │   │   ├── Timer.tsx              # Turn timer
│   │   │   │   ├── Button.tsx             # Styled button
│   │   │   │   └── Modal.tsx              # Generic modal
│   │   │   │
│   │   │   ├── lobby/
│   │   │   │   ├── CasinoInterior.tsx     # The main illustrated casino view
│   │   │   │   ├── GameSpot.tsx           # Clickable area on the casino image
│   │   │   │   └── ModeSelect.tsx         # Offline vs Online modal
│   │   │   │
│   │   │   ├── blackjack/
│   │   │   │   ├── BlackjackTable.tsx     # Table layout
│   │   │   │   ├── DealerHand.tsx         # Dealer's cards
│   │   │   │   ├── PlayerHand.tsx         # Player's cards
│   │   │   │   └── BlackjackControls.tsx  # Hit, Stand, Double, Split buttons
│   │   │   │
│   │   │   ├── poker/
│   │   │   │   ├── PokerTable.tsx         # Table with 5 seats
│   │   │   │   ├── CommunityCards.tsx     # The 5 community cards
│   │   │   │   ├── PlayerHand.tsx         # Player's 2 hole cards
│   │   │   │   ├── PotDisplay.tsx         # Current pot amount
│   │   │   │   └── PokerControls.tsx      # Fold, Call, Raise + slider
│   │   │   │
│   │   │   ├── baccarat/
│   │   │   │   ├── BaccaratTable.tsx      # Table layout
│   │   │   │   ├── BetAreas.tsx           # Player/Banker/Tie bet zones
│   │   │   │   ├── HandDisplay.tsx        # Cards for player/banker
│   │   │   │   └── BaccaratControls.tsx   # Place bet, deal
│   │   │   │
│   │   │   ├── roulette/
│   │   │   │   ├── RouletteWheel.tsx      # Spinning wheel animation
│   │   │   │   ├── BettingBoard.tsx       # Number grid + outside bets
│   │   │   │   ├── BetPlacer.tsx          # Chip placement on board
│   │   │   │   └── RouletteControls.tsx   # Spin, clear bets
│   │   │   │
│   │   │   └── auth/
│   │   │       ├── LoginForm.tsx          # Email + password form
│   │   │       ├── OAuthButtons.tsx       # Google + Facebook login buttons
│   │   │       └── RegisterForm.tsx       # Registration form
│   │   │
│   │   ├── types/
│   │   │   ├── game.ts                    # GameState, Player, Card, etc.
│   │   │   ├── poker.ts                   # PokerGameState extends GameState
│   │   │   ├── blackjack.ts              # BlackjackGameState
│   │   │   ├── baccarat.ts              # BaccaratGameState
│   │   │   ├── roulette.ts              # RouletteGameState
│   │   │   ├── user.ts                   # User, AuthToken
│   │   │   ├── room.ts                   # Room, RoomSettings
│   │   │   └── ws.ts                     # WebSocket message types
│   │   │
│   │   └── utils/
│   │       ├── cardUtils.ts              # Card display helpers
│   │       └── chipUtils.ts              # Chip formatting, denominations
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── backend/                              # Go/Gin server
│   ├── cmd/
│   │   └── server/
│   │       └── main.go                   # Entry point, starts Gin server
│   │
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go                 # Env vars, DB URL, JWT secret, OAuth keys
│   │   │
│   │   ├── models/
│   │   │   ├── user.go                   # User struct + DB methods
│   │   │   ├── room.go                   # Room struct
│   │   │   ├── game_state.go             # Base GameState struct (JSON-serializable)
│   │   │   ├── poker.go                  # PokerState embeds GameState
│   │   │   ├── blackjack.go              # BlackjackState
│   │   │   ├── baccarat.go               # BaccaratState
│   │   │   ├── roulette.go               # RouletteState
│   │   │   └── chip_transaction.go       # Chip ledger entries
│   │   │
│   │   ├── handlers/
│   │   │   ├── auth.go                   # POST /auth/login, /auth/register, /auth/oauth
│   │   │   ├── user.go                   # GET /users/me, PATCH /users/me
│   │   │   ├── room.go                   # POST /rooms, GET /rooms/:id, POST /rooms/:id/join
│   │   │   └── ws.go                     # WebSocket upgrade handler
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.go                   # JWT validation middleware
│   │   │   └── cors.go                   # CORS config
│   │   │
│   │   ├── ws/
│   │   │   ├── hub.go                    # WebSocket hub - manages all connections
│   │   │   ├── client.go                 # Single WS connection wrapper
│   │   │   ├── room.go                   # Room-level message routing
│   │   │   └── messages.go               # WS message type definitions
│   │   │
│   │   ├── game/
│   │   │   ├── engine.go                 # Interface: StartGame, HandleAction, GetState
│   │   │   ├── poker.go                  # Poker game logic
│   │   │   │                             #   - deal, bet rounds, showdown
│   │   │   │                             #   - hand evaluation
│   │   │   │                             #   - blind management
│   │   │   ├── blackjack.go              # Blackjack game logic
│   │   │   │                             #   - deal, hit, stand, double, split
│   │   │   │                             #   - dealer AI (hit on soft 17)
│   │   │   ├── baccarat.go               # Baccarat game logic
│   │   │   │                             #   - punto banco rules
│   │   │   │                             #   - third card rule
│   │   │   ├── roulette.go               # Roulette game logic
│   │   │   │                             #   - European single-zero
│   │   │   │                             #   - bet types, payout calc
│   │   │   ├── deck.go                   # Deck management (shuffle, draw)
│   │   │   └── hand_eval.go              # Poker hand ranking evaluator
│   │   │
│   │   ├── bot/
│   │   │   ├── bot.go                    # Bot interface
│   │   │   ├── poker_bot.go              # Poker bot (user will implement)
│   │   │   ├── blackjack_bot.go          # Blackjack bot
│   │   │   └── roulette_bot.go           # Roulette bot
│   │   │
│   │   ├── auth/
│   │   │   ├── jwt.go                    # JWT token generation + validation
│   │   │   ├── oauth_google.go           # Google OAuth2 flow
│   │   │   └── oauth_facebook.go         # Facebook OAuth2 flow
│   │   │
│   │   └── db/
│   │       ├── postgres.go               # DB connection + migration runner
│   │       └── migrations/
│   │           ├── 001_create_users.sql
│   │           ├── 002_create_rooms.sql
│   │           ├── 003_create_games.sql
│   │           └── 004_create_chip_transactions.sql
│   │
│   ├── go.mod
│   └── go.sum
│
├── docker-compose.yml                    # PostgreSQL + Redis + backend + frontend
├── .env.example                          # Template for env vars
├── .gitignore
└── README.md
```

## Database Schema (PostgreSQL)

```sql
-- Users table
users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),          -- NULL for OAuth users
    display_name    VARCHAR(50) NOT NULL,
    avatar_url      VARCHAR(500),
    oauth_provider  VARCHAR(20),           -- 'google', 'facebook', NULL
    oauth_id        VARCHAR(255),
    chips           BIGINT DEFAULT 1000,   -- Starting chips
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
)

-- Rooms table
rooms (
    id              UUID PRIMARY KEY,
    code            VARCHAR(8) UNIQUE,     -- Short invite code
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
    │  GameState lives in Zustand store    │
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
    │  1. POST /api/rooms                  │
    │     → creates room, returns code     │
    │                                      │
    │  2. Friends open /join/:code         │
    │     → POST /api/rooms/:code/join     │
    │                                      │
    │  3. Host clicks "Start"              │
    │     → WS: { type: "start_game" }     │
    │                                      │
    │  4. Server creates GameState         │
    │     → WS broadcast to all players:   │
    │       { type: "game_state",          │
    │         data: GameState }            │
    │     (each player gets personalized   │
    │      view - hidden cards filtered)   │
    │                                      │
    │  5. Player acts                      │
    │     → WS: { type: "action",          │
    │             data: { action: "raise",  │
    │                     amount: 500 } }  │
    │                                      │
    │  6. Server validates, updates state  │
    │     → WS broadcast: updated          │
    │       GameState to all players       │
    └──────────────────────────────────────┘
```
