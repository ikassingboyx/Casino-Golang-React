# Casino App — Full Project Specification

---

## 1. Overview

A free-to-play browser-based casino app where users earn and spend chips (no real money).
Players can play alone against bots or create online rooms and invite friends via a link.
The main view is an illustrated casino interior where clicking on a game area opens that game.

**Games:** Blackjack, Texas Hold'em Poker, Baccarat, Roulette
**Frontend:** React + TypeScript (Vite)
**Backend:** Go + Gin
**Database:** PostgreSQL (with JSONB for game state)
**Real-time:** WebSockets (gorilla/websocket)
**Auth:** Email/password + Google OAuth + Facebook OAuth (JWT sessions)

---

## 2. Tech Stack

| Layer          | Technology                          | Why                                              |
|----------------|-------------------------------------|--------------------------------------------------|
| Frontend       | React 18 + TypeScript               | Component model fits card game UI                |
| Build tool     | Vite                                | Fast dev server, fast builds                     |
| Styling        | Tailwind CSS                        | Utility classes, easy dark casino theme          |
| Animations     | Framer Motion (`motion/react`)      | Card flips, chip slides, wheel spin, transitions |
| State          | Zustand                             | Lightweight, no boilerplate, works well with WS  |
| HTTP client    | Axios                               | Interceptors for JWT injection                   |
| WebSocket      | Native browser WebSocket API        | Simple, no extra library needed on frontend      |
| Backend        | Go 1.22 + Gin                       | Fast, great concurrency for WS, clean API        |
| WebSocket srv  | gorilla/websocket                   | Most battle-tested Go WS library                 |
| Auth           | JWT (golang-jwt/jwt v5)             | Stateless, easy to validate                      |
| OAuth          | golang.org/x/oauth2                 | Google + Facebook flows                          |
| Database       | PostgreSQL 16                       | ACID for chip balances, JSONB for game state     |
| DB migrations  | golang-migrate                      | Version-controlled schema changes                |
| Containerize   | Docker + docker-compose             | One command to start entire stack                |

---

## 3. User System

### 3.1 Registration & Login

Three ways to authenticate:
1. **Email + password** — stored as bcrypt hash in `users.password_hash`
2. **Google OAuth** — redirect to Google, get profile, upsert user with `oauth_provider='google'`
3. **Facebook OAuth** — same flow with Facebook

On first login/register, user gets **1000 starting chips**.

JWT is returned on successful auth. Token lifetime: 7 days.
Frontend stores JWT in `localStorage`. Axios interceptor attaches it to every request.
WebSocket connections authenticate by passing `?token=<jwt>` as a query param on connect.

### 3.2 User Profile

Each user has:
- `display_name` — shown at the table
- `avatar_url` — optional profile picture (from OAuth or upload)
- `chips` — current chip balance (integer, never goes negative)
- `last_daily_bonus_at` — timestamp of last bonus claim

### 3.3 Chip System

- Starting chips: **1000**
- Daily bonus: **500 chips**, claimable once every 24 hours
- If balance hits 0, a banner appears offering the daily bonus or telling them to come back tomorrow
- Enable transfer between players, no limits on bets (minimum 1 chip)
- Every chip movement is recorded in `chip_transactions` table (ledger)

Chip transaction examples:
- Win poker hand → `+1400` chips
- Lose blackjack bet of 200 → `-200` chips
- Daily bonus → `+500` chips, description: `"daily_bonus"`

---

## 4. Lobby (Main View)

### 4.1 Visual Design

The main page after login is a **full-screen illustrated casino interior image**.
On this image, four areas are positioned as clickable hotspots (using absolute-positioned divs over the image):
- Blackjack table area
- Poker table area
- Baccarat table area
- Roulette wheel area

Each hotspot has a subtle **glow/pulse animation** (Framer Motion) to hint it is clickable.
On hover, the area brightens and shows the game name.

### 4.2 Game Mode Selection

Clicking a game area opens a **modal** (`ModeSelect.tsx`) with two buttons:
- **Play Offline** — starts immediately with bots
- **Play Online** — shows room options: create room or enter invite code

The modal also shows a brief description of the game and payout rules.

### 4.3 Navigation

```
/                   → redirects to /lobby if logged in, else /login
/login              → login page
/register           → register page
/lobby              → casino interior (main view)
/game/:type/offline → offline game (blackjack, poker, baccarat, roulette)
/room/:code         → online room waiting area
/game/:type/:roomId → online game
/profile            → user profile + chip history
```

---

## 5. Room System (Online Play)

### 5.1 Creating a Room

From the `ModeSelect` modal, clicking "Play Online" → "Create Room" calls:
```
POST /api/rooms
Body: { gameType: "poker", settings: { bigBlind: 100 } }
Response: { roomId: "uuid", code: "XK4P9W" }
```

The user is redirected to `/room/XK4P9W` (the waiting room page).
The 6-character alphanumeric `code` is what gets shared with friends.

### 5.2 Joining a Room

Friends navigate to `/room/XK4P9W` or enter the code in the lobby.
```
POST /api/rooms/:code/join
Response: { roomId, gameType, players: [...], settings: {...} }
```

The user is then connected via WebSocket to that room.

### 5.3 Waiting Room (`RoomPage.tsx`)

Shows:
- Room code (large, easy to copy)
- List of players who have joined + their avatars
- Game settings (e.g. big blind for poker)
- "Start Game" button visible only to the host, enabled when ≥2 players present
- For Poker/Blackjack/Roulette: max 5 players

### 5.4 Room Lifecycle

```
waiting → playing → finished
```
- `waiting`: players joining, host can start
- `playing`: game in progress
- `finished`: game over, results shown, host can start a new round

---

## 6. WebSocket Protocol

### 6.1 Connection

Frontend connects on entering a room or starting offline game:
```
ws://localhost:8080/ws?token=<jwt>&roomId=<roomId>
```

The Hub on the backend:
- Validates the JWT
- Registers the client to that room's broadcast group
- Stores `client → playerID` mapping

### 6.2 Message Format

All WebSocket messages (both directions) follow this envelope:
```json
{
  "type": "event_name",
  "data": { ... }
}
```

### 6.3 Client → Server Events

| Event              | Data                                      | Description                       |
|--------------------|-------------------------------------------|-----------------------------------|
| `start_game`       | `{}`                                      | Host starts the game              |
| `player_action`    | `{ action, amount? }`                     | Player takes a game action        |
| `place_bet`        | `{ bets: [...] }`                         | Roulette: place chips on board    |
| `leave_room`       | `{}`                                      | Player leaves voluntarily         |
| `ping`             | `{}`                                      | Heartbeat (every 30s)             |

### 6.4 Server → Client Events

| Event              | Data                                      | Description                               |
|--------------------|-------------------------------------------|-------------------------------------------|
| `game_state`       | `GameState`                               | Full state update (personalized per player) |
| `player_joined`    | `{ player }`                              | New player joined room                    |
| `player_left`      | `{ playerId }`                            | Player disconnected                       |
| `game_started`     | `{ gameState }`                           | Game has begun                            |
| `action_result`    | `{ valid, reason?, gameState }`           | Response to player action                 |
| `game_over`        | `{ winners, chipChanges, gameState }`     | Round ended                               |
| `timer_tick`       | `{ secondsLeft }`                         | Roulette betting countdown                |
| `error`            | `{ message }`                             | Validation error                          |
| `pong`             | `{}`                                      | Heartbeat response                        |

### 6.5 Card Privacy

When broadcasting `game_state` in Poker and Blackjack, the server sends **personalized views**:
- A player only sees their own hole cards
- Other players' cards are sent as `{ hidden: true }` until showdown
- The server never sends the full unfiltered state to any client

### 6.6 Disconnect Handling

- Backend detects disconnect via write/read error on the WS connection
- Broadcasts `player_left` to room
- **Poker**: auto-folds the disconnected player for the current round. If they reconnect before the next hand, they continue. If not, they are removed after the hand ends.
- **Blackjack**: auto-stand on their turn
- **Roulette**: their already-placed bets still count for the current spin
- Reconnect: client reconnects with same JWT + roomId, server restores their position

---

## 7. Game Specifications

### 7.1 Shared Concepts

**Card representation:**
```json
{ "suit": "hearts", "rank": "A", "hidden": false }
```
Suits: `hearts`, `diamonds`, `clubs`, `spades`
Ranks: `2-10`, `J`, `Q`, `K`, `A`

**Deck:** Standard 52-card deck. The `deck.go` module handles creation and shuffling (Fisher-Yates).

**Base GameState fields (all games share these):**
```json
{
  "gameId":    "uuid",
  "roomId":    "uuid",
  "gameType":  "poker",
  "phase":     "betting",
  "players":   [ ... ],
  "isOffline": false,
  "status":    "playing",
  "lastAction": { "playerId": "uuid", "action": "raise", "amount": 200 }
}
```

---

### 7.2 Blackjack

#### Rules
- Standard casino Blackjack
- Dealer hits on soft 17
- Blackjack pays 3:2
- Double down allowed on any first 2 cards
- Split allowed once (no re-split)
- No insurance
- Deck: 6-deck shoe, reshuffled when 25% remaining

#### Online vs Offline
- **Offline**: 1 human player vs dealer bot
- **Online**: up to 5 human players, all vs the same dealer (house bot)
  - Players act left to right, dealer acts last
  - Each player has their own bet and hand, independent of others

#### Phases
```
betting → dealing → player_turns → dealer_turn → payout → betting
```

1. **betting** — each player places a bet (chip selector UI). 30 second window online, instant offline
2. **dealing** — server deals 2 cards to each player and 2 to dealer (1 hidden)
3. **player_turns** — each player acts in order
4. **dealer_turn** — dealer reveals hidden card, draws until ≥17
5. **payout** — compare each player's hand to dealer, resolve chips
6. Back to **betting**

#### Player Actions
| Action     | Condition                              | Effect                                         |
|------------|----------------------------------------|------------------------------------------------|
| `hit`      | Not bust, not stand                    | Draw one card                                  |
| `stand`    | Any time                               | End turn                                       |
| `double`   | Exactly 2 cards, chips available       | Double bet, draw exactly 1 card, then stand   |
| `split`    | 2 cards of same rank, chips available  | Split into 2 hands, each gets a new card      |

#### Blackjack GameState
```json
{
  "gameId": "uuid",
  "gameType": "blackjack",
  "phase": "player_turns",
  "currentPlayerIndex": 1,
  "players": [
    {
      "id": "uuid",
      "name": "Alice",
      "chips": 4800,
      "bet": 200,
      "hands": [
        {
          "cards": [{"suit":"hearts","rank":"A"},{"suit":"spades","rank":"K"}],
          "bet": 200,
          "status": "blackjack"
        }
      ],
      "isBot": false
    }
  ],
  "dealerHand": {
    "cards": [
      {"suit":"clubs","rank":"7"},
      {"suit":"hearts","rank":"5","hidden":true}
    ]
  }
}
```

#### Payouts
| Outcome              | Payout       |
|----------------------|--------------|
| Blackjack            | 3:2          |
| Win                  | 1:1          |
| Push (tie)           | Return bet   |
| Lose                 | Lose bet     |
| Dealer bust          | 1:1 all standing |

---

### 7.3 Texas Hold'em Poker

#### Rules
- No-limit Texas Hold'em
- Maximum 5 players per table
- Configurable big blind (set by host when creating room)
- Small blind = big blind / 2
- Standard hand rankings
- No limit on raise amount (minimum raise = current bet + last raise size)

#### Online vs Offline
- **Offline**: 1 human + 4 bots
- **Online**: 2–5 human players, no bots

#### Phases (per hand)
```
pre_flop → flop → turn → river → showdown → next_hand
```

1. **pre_flop** — dealer button assigned, blinds posted, 2 hole cards dealt, betting round
2. **flop** — 3 community cards revealed, betting round
3. **turn** — 1 community card revealed, betting round
4. **river** — 1 community card revealed, final betting round
5. **showdown** — remaining players reveal hands, best hand wins pot
6. **next_hand** — dealer button moves clockwise, new hand begins

Betting round order: starts left of big blind (pre-flop), left of dealer (all other rounds).
Betting ends when all active players have put in equal amounts and had a chance to act.

#### Player Actions
| Action   | Condition                          | Effect                                     |
|----------|------------------------------------|--------------------------------------------|
| `fold`   | Any time in turn                   | Discard hand, lose current bet             |
| `check`  | No bet to call                     | Pass, next player acts                     |
| `call`   | There is a bet to match            | Match current bet                          |
| `raise`  | Any time, enough chips             | Increase bet, others must call/re-raise    |
| `all_in` | Not enough chips to call/raise     | Put all remaining chips in                 |

No turn timer — players take as long as needed.

#### Disconnect
Auto-fold for current betting round. If player reconnects before next hand, they rejoin.
If they do not reconnect, they are removed before next hand starts and their chips are refunded.

#### Side Pots
If a player goes all-in for less than the current bet, a side pot is created.
The all-in player can only win up to the amount they matched from each other player.

#### Poker GameState
```json
{
  "gameId": "uuid",
  "gameType": "poker",
  "phase": "flop",
  "dealerIndex": 0,
  "smallBlindIndex": 1,
  "bigBlindIndex": 2,
  "currentTurnIndex": 3,
  "bigBlind": 100,
  "smallBlind": 50,
  "pot": 850,
  "sidePots": [],
  "communityCards": [
    {"suit":"hearts","rank":"A"},
    {"suit":"clubs","rank":"10"},
    {"suit":"diamonds","rank":"7"}
  ],
  "currentBet": 200,
  "minRaise": 200,
  "players": [
    {
      "id": "uuid",
      "name": "Bob",
      "chips": 4750,
      "currentBet": 200,
      "totalBetThisHand": 300,
      "cards": [
        {"suit":"spades","rank":"K"},
        {"suit":"hearts","rank":"Q"}
      ],
      "status": "active",
      "isBot": false,
      "position": 0
    }
  ],
  "lastAction": { "playerId": "uuid", "action": "raise", "amount": 200 },
  "winners": null
}
```
Note: `cards` for other players are sent as `[{"hidden":true},{"hidden":true}]` until showdown.

#### Hand Rankings (high to low)
1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

The `hand_eval.go` module evaluates and compares hands for showdown.

---

### 7.4 Baccarat

#### Rules
- Punto Banco variant (player has no decisions — fully automated)
- Player bets on: Player hand, Banker hand, or Tie
- Banker has a 5% commission on winning banker bets
- Third card rule applies automatically

#### Online vs Offline
- **Both modes**: 1 player vs house. No multiplayer for Baccarat.
- In "online" mode for Baccarat the player still plays alone — it's just logged to their account.

#### Phases
```
betting → dealing → third_card → result → betting
```

1. **betting** — player places chip(s) on Player, Banker, and/or Tie areas (can bet on multiple)
2. **dealing** — 2 cards dealt to Player, 2 to Banker, revealed immediately
3. **third_card** — third card rule applied automatically by server
4. **result** — winner determined, chips paid out

#### Third Card Rule
- **Player hand**: draws third card if total is 0–5, stands on 6–7. 8–9 is natural (no draw).
- **Banker hand**: follows a specific table based on banker total and player's third card.
- Server handles this entirely — player has no input during this phase.

#### Payouts
| Bet outcome     | Payout          |
|-----------------|-----------------|
| Player win      | 1:1             |
| Banker win      | 1:1 minus 5%    |
| Tie             | 8:1             |
| Tie (push)      | Return bet      |

#### Baccarat GameState
```json
{
  "gameId": "uuid",
  "gameType": "baccarat",
  "phase": "result",
  "playerHand": {
    "cards": [{"suit":"hearts","rank":"9"},{"suit":"clubs","rank":"5"}],
    "total": 4
  },
  "bankerHand": {
    "cards": [{"suit":"spades","rank":"7"},{"suit":"diamonds","rank":"3"},{"suit":"hearts","rank":"6"}],
    "total": 6
  },
  "bets": {
    "player": 300,
    "banker": 0,
    "tie": 100
  },
  "result": "banker",
  "chipChange": -200,
  "players": [
    {
      "id": "uuid",
      "name": "Alice",
      "chips": 4800
    }
  ]
}
```

---

### 7.5 Roulette

#### Rules
- European single-zero wheel (numbers 0–36)
- Multiple players can bet on the same spin (up to 5 players online)
- 30-second betting window, then wheel spins automatically
- Players can place multiple bets per round

#### Online vs Offline
- **Offline**: 1 player, no timer (manual "spin" button)
- **Online**: up to 5 players all betting on the same 30-second round then same spin

#### Bet Types
| Bet Type        | Description                          | Payout |
|-----------------|--------------------------------------|--------|
| Straight Up      | Single number (0–36)                | 35:1   |
| Split            | 2 adjacent numbers                  | 17:1   |
| Street           | Row of 3 numbers                    | 11:1   |
| Corner           | 4 numbers sharing a corner          | 8:1    |
| Six Line         | 2 adjacent rows (6 numbers)         | 5:1    |
| Column           | 12 numbers in a column              | 2:1    |
| Dozen            | 1st/2nd/3rd 12                      | 2:1    |
| Red/Black        | 18 numbers                          | 1:1    |
| Odd/Even         | 18 numbers                          | 1:1    |
| Low/High         | 1–18 or 19–36                       | 1:1    |

Zero (0) is green — wins only straight-up or split bets covering it. All red/black/odd/even/low/high bets lose on 0.

#### Phases (online)
```
betting (30s) → spinning → result → betting
```
- **betting**: timer counts down 30 seconds. Players place chips on the board. Can add/remove bets until time runs out.
- **spinning**: server picks random number (0–36), wheel animation plays on frontend
- **result**: winning bets paid, losing bets removed, new round starts

Offline replaces the 30s timer with a manual "Spin" button.

#### Roulette GameState
```json
{
  "gameId": "uuid",
  "gameType": "roulette",
  "phase": "betting",
  "timerSeconds": 22,
  "lastResult": 17,
  "players": [
    {
      "id": "uuid",
      "name": "Carlos",
      "chips": 3200,
      "bets": [
        { "type": "straight", "numbers": [7], "amount": 100 },
        { "type": "red", "numbers": [], "amount": 200 }
      ]
    },
    {
      "id": "uuid2",
      "name": "Diana",
      "chips": 5000,
      "bets": [
        { "type": "black", "numbers": [], "amount": 500 }
      ]
    }
  ],
  "winningNumber": null,
  "payouts": null
}
```

---

## 8. Frontend Architecture

### 8.1 Page Flow

```
/login or /register
       ↓
/lobby  ← casino interior image with 4 clickable game spots
       ↓ (click a game spot)
  ModeSelect modal: [ Play Offline ] [ Play Online ]
       ↓ offline                  ↓ online
/game/:type/offline          room options modal
       ↓                     create or enter code
  Game UI                         ↓
  (no WS, REST only)         /room/:code (waiting room)
                                  ↓ (host starts)
                             /game/:type/:roomId
                                  ↓
                              Game UI (WS connected)
```

### 8.2 State Management (Zustand)

**`authStore`**
```ts
{
  user: User | null,
  token: string | null,
  login(token, user): void,
  logout(): void
}
```

**`gameStore`**
```ts
{
  gameState: GameState | null,
  roomId: string | null,
  isConnected: boolean,
  setGameState(state): void,
  sendAction(action, amount?): void
}
```

**`chipStore`**
```ts
{
  balance: number,
  canClaimDaily: boolean,
  setBalance(n): void,
  claimDaily(): Promise<void>
}
```

### 8.3 WebSocket Hook (`useWebSocket.ts`)

Manages the WS lifecycle:
- Connects on mount with JWT + roomId
- Sends `ping` every 30 seconds
- On `game_state` message → updates `gameStore`
- On `game_over` message → shows results modal, updates chip balance
- On disconnect → attempts reconnect up to 3 times with exponential backoff
- Exposes `send(type, data)` function

### 8.4 Animations (Framer Motion)

| Animation            | Where                       | Description                                      |
|----------------------|-----------------------------|--------------------------------------------------|
| Card deal            | All card games              | Card slides in from deck position, flips over    |
| Card flip            | Blackjack dealer reveal     | Y-axis rotation to reveal hidden card            |
| Chip move            | All games when betting      | Chip slides from stack to bet area               |
| Chip win             | All games on payout         | Chips slide back to player stack                 |
| Wheel spin           | Roulette                    | CSS/Framer rotation, decelerates to final number |
| Ball                 | Roulette                    | SVG circle animates around wheel track           |
| Page transition      | Between pages               | Fade in/out                                      |
| Modal                | ModeSelect, results         | Scale up from center                             |
| Game spot hover      | Lobby                       | Glow pulse, brightness increase                  |
| Timer bar            | Roulette                    | Horizontal progress bar depleting over 30s       |

### 8.5 Component Hierarchy (abbreviated)

```
App
├── LoginPage
│   └── LoginForm, OAuthButtons
├── RegisterPage
│   └── RegisterForm
├── LobbyPage
│   ├── CasinoInterior          ← full-screen image
│   │   ├── GameSpot (x4)       ← absolute positioned hotspots
│   └── ModeSelect (modal)
├── RoomPage
│   ├── PlayerList
│   ├── RoomCode
│   └── StartButton
├── BlackjackPage
│   ├── BlackjackTable
│   │   ├── DealerHand
│   │   ├── PlayerSeat (x5)
│   │   │   └── PlayerHand
│   │   │       └── Card (x2+)
│   └── BlackjackControls       ← hit/stand/double/split
├── PokerPage
│   ├── PokerTable
│   │   ├── CommunityCards
│   │   │   └── Card (x5)
│   │   ├── PotDisplay
│   │   └── PlayerSeat (x5)
│   │       └── PlayerHand
│   │           └── Card (x2)
│   └── PokerControls           ← fold/check/call/raise slider
├── BaccaratPage
│   ├── BaccaratTable
│   │   ├── HandDisplay (player)
│   │   ├── HandDisplay (banker)
│   │   └── BetAreas            ← player/banker/tie zones
│   └── BaccaratControls        ← chip selector, deal button
├── RoulettePage
│   ├── RouletteWheel           ← animated SVG wheel
│   ├── BettingBoard            ← number grid + outside bets
│   │   └── BetPlacer           ← click to place chip
│   ├── TimerBar                ← 30s countdown
│   └── RouletteControls        ← spin (offline) / clear bets
└── ProfilePage
    ├── ChipBalance
    ├── DailyBonusButton
    └── TransactionHistory
```

---

## 9. Backend Architecture

### 9.1 Entry Point (`cmd/server/main.go`)

1. Load config from env vars
2. Connect to PostgreSQL, run pending migrations
3. Initialize Gin router with middleware (CORS, auth)
4. Register REST routes
5. Initialize WebSocket Hub (starts in goroutine)
6. Register WS upgrade endpoint
7. Start HTTP server on configured port

### 9.2 REST API Endpoints

**Auth**
```
POST   /api/auth/register           { email, password, displayName }
POST   /api/auth/login              { email, password }
GET    /api/auth/google             → redirect to Google OAuth
GET    /api/auth/google/callback    → handle code, return JWT
GET    /api/auth/facebook           → redirect to Facebook OAuth
GET    /api/auth/facebook/callback  → handle code, return JWT
```

**Users** (JWT required)
```
GET    /api/users/me                → current user profile + chip balance
PATCH  /api/users/me                { displayName?, avatarUrl? }
POST   /api/users/me/daily-bonus    → claim daily 500 chips (400 if already claimed today)
```

**Rooms** (JWT required)
```
POST   /api/rooms                   { gameType, settings }  → { roomId, code }
GET    /api/rooms/:code             → room info + player list
POST   /api/rooms/:code/join        → add current user to room
DELETE /api/rooms/:code/leave       → remove current user from room
```

**WebSocket**
```
GET    /ws?token=<jwt>&roomId=<uuid>  → upgrade to WebSocket
```

**Offline game** (JWT required)
```
POST   /api/game/offline/start      { gameType, settings }  → initial GameState
POST   /api/game/offline/action     { gameId, action, amount? }  → updated GameState
```

### 9.3 WebSocket Hub (`internal/ws/hub.go`)

The Hub is a singleton that manages all active connections.

```
Hub
├── rooms: map[roomId] → Room
├── clients: map[*Client] → playerID
├── register: chan *Client
├── unregister: chan *Client
└── broadcast: chan BroadcastMsg

Room
├── roomId: string
├── clients: map[*Client]bool
├── gameEngine: GameEngine   ← the active game
└── broadcast(msg)           ← sends to all clients in room

Client
├── conn: *websocket.Conn
├── playerId: string
├── roomId: string
├── send: chan []byte
├── readPump()  ← goroutine reading from browser
└── writePump() ← goroutine writing to browser
```

Each client gets two goroutines: `readPump` and `writePump`.
`readPump` reads messages from the browser, parses them, routes them to the game engine.
`writePump` reads from `client.send` channel, writes to the browser.

### 9.4 Game Engine Interface (`internal/game/engine.go`)

```go
type GameEngine interface {
    StartGame(players []Player) (GameState, error)
    HandleAction(state GameState, playerID string, action Action) (GameState, error)
    GetStateForPlayer(state GameState, playerID string) GameState
    IsGameOver(state GameState) bool
    ResolveGame(state GameState) (GameState, []ChipChange, error)
}
```

Each game (`poker.go`, `blackjack.go`, `baccarat.go`, `roulette.go`) implements this interface.
`GetStateForPlayer` filters hidden information (other players' cards) before the state is sent to a client.

### 9.5 Offline Game Flow (REST)

For offline mode, no WebSocket is needed. The game state lives in the database.

```
POST /api/game/offline/start
  → Creates game record in DB
  → Calls engine.StartGame()
  → Saves initial state to games.state JSONB
  → Returns GameState (with bot perspective already resolved)

POST /api/game/offline/action
  → Loads game from DB by gameId
  → Calls engine.HandleAction()
  → Server auto-resolves all bot turns until it's human's turn again
  → Saves updated state to DB
  → Returns final GameState
```

### 9.6 Bot System (`internal/bot/`)

```go
type Bot interface {
    DecideAction(state GameState, playerID string) Action
}
```

The game engine calls `bot.DecideAction()` when it is a bot's turn (offline mode).
Bot implementations are intentionally minimal stubs — the user will implement full logic:
- `PokerBot` — you implement (fold/call/raise decisions)
- `BlackjackBot` — dealer rules (hit on soft 17) — deterministic, not user-implemented
- `BaccaratBot` — dealer/banker draws — deterministic per rules

### 9.7 Chip Transaction Safety

Chip changes are always written within a PostgreSQL transaction:
```sql
BEGIN;
  UPDATE users SET chips = chips + $1 WHERE id = $2;
  INSERT INTO chip_transactions (user_id, game_id, amount, balance_after, description)
    VALUES ($2, $3, $1, (SELECT chips FROM users WHERE id=$2), $4);
COMMIT;
```
This prevents any scenario where chips are lost due to a partial write.

---

## 10. Database Schema

### `users`
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),
    display_name    VARCHAR(50) NOT NULL,
    avatar_url      VARCHAR(500),
    oauth_provider  VARCHAR(20),
    oauth_id        VARCHAR(255),
    chips           BIGINT NOT NULL DEFAULT 1000,
    last_daily_bonus_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### `rooms`
```sql
CREATE TABLE rooms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(8) UNIQUE NOT NULL,
    game_type   VARCHAR(20) NOT NULL,
    host_id     UUID NOT NULL REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'waiting',
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### `games`
```sql
CREATE TABLE games (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID REFERENCES rooms(id),
    game_type   VARCHAR(20) NOT NULL,
    state       JSONB NOT NULL,
    is_offline  BOOLEAN NOT NULL DEFAULT FALSE,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP
);
```

### `chip_transactions`
```sql
CREATE TABLE chip_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    game_id         UUID REFERENCES games(id),
    amount          BIGINT NOT NULL,
    balance_after   BIGINT NOT NULL,
    description     VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON chip_transactions(user_id);
```

---

## 11. Configuration & Environment

`.env` variables:
```
# Server
PORT=8080
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgres://casino:password@localhost:5432/casino_db

# Auth
JWT_SECRET=your-very-secret-key-here
JWT_EXPIRY=168h

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8080/api/auth/google/callback

# Facebook OAuth
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URL=http://localhost:8080/api/auth/facebook/callback
```

---

## 12. docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: casino_db
      POSTGRES_USER: casino
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    env_file: .env
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8080

volumes:
  postgres_data:
```

---

## 13. Build Order

This is the recommended implementation sequence, from simplest to most complex:

### Phase 1 — Foundation
1. `docker-compose.yml` + PostgreSQL running
2. Go project skeleton: `main.go`, Gin setup, CORS, health endpoint
3. DB migrations: users, rooms, games, chip_transactions
4. Auth: email/password register + login, JWT middleware
5. React project skeleton: Vite + TypeScript + Tailwind + Zustand + React Router
6. Login/Register pages connected to backend
7. JWT stored in localStorage, Axios interceptor

### Phase 2 — Blackjack Offline (proves the game engine pattern)
8. Deck module (`deck.go`)
9. Blackjack game engine (`blackjack.go`) — full rules
10. Offline game REST endpoints (`/api/game/offline/start`, `/api/game/offline/action`)
11. Blackjack frontend components (table, cards, controls)
12. Framer Motion card deal animation
13. Chip deduction/addition + chip_transactions

### Phase 3 — Online infrastructure
14. WebSocket Hub + Client (`hub.go`, `client.go`)
15. Room creation + join REST endpoints
16. Room waiting page
17. Blackjack online (WS game flow with multiple players)
18. Card privacy filtering (`GetStateForPlayer`)

### Phase 4 — Lobby
19. Casino interior image (generate with Midjourney/DALL-E)
20. `CasinoInterior` + `GameSpot` components with hotspot overlays
21. `ModeSelect` modal
22. Polish animations (glow, hover effects)

### Phase 5 — Remaining Games
23. Poker hand evaluator (`hand_eval.go`)
24. Poker game engine (most complex — side pots, hand rankings)
25. Poker frontend (table, community cards, raise slider)
26. Poker bots (stubs — user implements logic)
27. Roulette game engine (spin, bet resolution)
28. Roulette frontend (wheel animation, betting board, 30s timer)
29. Baccarat game engine (third card rule)
30. Baccarat frontend

### Phase 6 — Auth & Profile
31. Google OAuth flow
32. Facebook OAuth flow
33. Profile page: chip balance, daily bonus button, transaction history

### Phase 7 — Polish
34. Disconnect handling (auto-fold logic)
35. Reconnect with exponential backoff
36. Win/loss animations (chip movement, result overlays)
37. Mobile responsiveness
38. Error states (connection lost banner, invalid action feedback)

---

## 14. Open Questions for Later

These are things not decided yet that will need answers before implementation:

- **Leaderboard**: global chip rankings? All-time or weekly?
- **Avatar upload**: allow custom image upload, or just OAuth avatar + initials fallback?
- **Invite link format**: `/join/XK4P9W` as a full URL? Copy button in the room?
- **Profile stats**: what stats to show? (games played, biggest win, win rate per game)
- **Chip overflow**: is there a max chip cap, or unlimited accumulation?
- **Multiple hands per session**: for Poker online, does the game continue round after round until someone leaves, or is it one hand per room?
