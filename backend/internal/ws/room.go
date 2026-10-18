package ws

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"casino/internal/game"
	"casino/internal/models"
)

const (
	abandonedRoomTTL = 2 * time.Minute  // a new room nobody joins is closed
	emptyRoomTTL     = 30 * time.Second // after everyone left; long enough to reconnect after a refresh
	rejoinGrace      = 5 * time.Second  // a player who drops out of the waiting room keeps their seat this long
	betTime          = 20 * time.Second // the rest of the table has this long to bet once someone has
	turnTime         = 30 * time.Second // to act on your turn
	dbTimeout        = 10 * time.Second
)

// nextRoundDelay is how long a finished round stays on the table before the
// next one is dealt: long enough for the table's animations and the result.
var nextRoundDelay = map[string]time.Duration{
	"blackjack": 6 * time.Second,
	"baccarat":  10 * time.Second,
	"roulette":  15 * time.Second, // the wheel spins for 10s
	"poker":     8 * time.Second,
}

var (
	errSomethingWrong = errors.New("something went wrong, try again")
	errNotEnoughChips = errors.New("not enough chips")
	errPokerPlayers   = errors.New("poker needs at least two players: add a bot or wait for a friend")
)

// member is a player at the table.
type member struct {
	userID  string
	name    string
	avatar  *string
	chips   int64 // their balance; a bot's stack
	isBot   bool  // poker: a bot the host seated; never connects
	clients map[*Client]bool
}

// botNames are given to the bots a host seats, first free name first.
var botNames = []string{"Ace", "Duke", "Lucky", "Vegas", "Ruby"}

// Room is an online table: up to five players who joined with its code. The
// host starts the game; from then on rounds follow each other until everyone
// has left. All of a room's state is guarded by mu; database writes happen
// under it too, so a room applies one change at a time.
type Room struct {
	hub      *Hub
	ID       string // rooms.id
	Code     string
	GameType string
	engine   game.GameEngine

	mu      sync.Mutex
	hostID  string
	status  string // waiting, playing
	members []*member
	closed  bool
	cleanup *time.Timer

	// The round on the table; nil while waiting.
	state  any
	gameID string
	// stakes holds the chips each player of the round has in state as last
	// settled; the difference after a change is applied to their balance.
	stakes  map[string]int64
	results map[string]*models.ChipChange // once the round is over
	dealer  int                           // poker: the next hand's button, -1 for random
	botSeq  int                           // numbers the bots' ids

	timer    *time.Timer
	timerGen int // bumped whenever the timer changes, so a stale one does nothing
	waitKey  string
	deadline time.Time
}

func newRoom(hub *Hub, id, code, gameType, hostID string, engine game.GameEngine) *Room {
	return &Room{hub: hub, ID: id, Code: code, GameType: gameType, engine: engine, hostID: hostID, status: "waiting", dealer: -1}
}

// Join seats the client's player (or adds a connection for a player who is
// already seated) and sends them the room and any round in play.
func (r *Room) Join(c *Client, user *models.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return errors.New("this table has closed")
	}
	m := r.member(user.ID)
	if m == nil {
		if len(r.members) >= models.MaxRoomPlayers {
			return fmt.Errorf("this table is full (%d players)", models.MaxRoomPlayers)
		}
		m = &member{userID: user.ID, clients: map[*Client]bool{}}
		r.members = append(r.members, m)
		// The creator hosts even if a friend's connection gets in first; once
		// the table has emptied, whoever sits down next hosts.
		if r.hostID == "" {
			r.hostID = user.ID
		}
	}
	m.name, m.avatar, m.chips = user.DisplayName, user.AvatarURL, user.Chips
	m.clients[c] = true
	c.room = r
	if r.cleanup != nil {
		r.cleanup.Stop()
		r.cleanup = nil
	}
	r.broadcastRoom()
	r.sendGame(m)
	return nil
}

// Info is the room as shown in the waiting room.
func (r *Room) Info() RoomInfo {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.info()
}

func (r *Room) info() RoomInfo {
	players := make([]models.RoomPlayer, len(r.members))
	for i, m := range r.members {
		players[i] = models.RoomPlayer{
			UserID: m.userID, DisplayName: m.name, AvatarURL: m.avatar, Chips: m.chips,
			IsHost: m.userID == r.hostID, Connected: m.isBot || len(m.clients) > 0, IsBot: m.isBot,
		}
	}
	return RoomInfo{Code: r.Code, GameType: r.GameType, HostID: r.hostID, Status: r.status, MaxPlayers: models.MaxRoomPlayers, Players: players}
}

func (r *Room) handleMessage(c *Client, msg Message) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if c.closed {
		return
	}
	switch msg.Type {
	case MsgPing:
		c.queue(encode(MsgPong, nil))
	case MsgStartGame:
		r.ack(c, msg.ID, r.start(c.PlayerID))
	case MsgPlayerAction:
		var a models.Action
		err := json.Unmarshal(msg.Data, &a)
		if err != nil {
			err = errors.New("bad action")
		} else {
			err = r.act(c.PlayerID, a)
		}
		r.ack(c, msg.ID, err)
	case MsgAddBot:
		r.ack(c, msg.ID, r.addBot(c.PlayerID))
	case MsgRemoveBot:
		var data struct {
			UserID string `json:"userId"`
		}
		json.Unmarshal(msg.Data, &data)
		r.ack(c, msg.ID, r.removeBot(c.PlayerID, data.UserID))
	case MsgLeaveRoom:
		r.leave(c.PlayerID)
	default:
		log.Printf("unknown ws message type: %s", msg.Type)
	}
}

func (r *Room) ack(c *Client, id string, err error) {
	var a Ack
	if err != nil {
		a.Error = err.Error()
	}
	data, _ := json.Marshal(a)
	msg, _ := json.Marshal(Message{Type: MsgAck, ID: id, Data: data})
	c.queue(msg)
}

// disconnect drops a closed connection. A player whose last connection
// closes keeps their place in a game in play (their turns time out), and
// briefly in the waiting room so a refresh doesn't cost them their seat.
func (r *Room) disconnect(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	c.shutdown()
	m := r.member(c.PlayerID)
	if m == nil || !m.clients[c] {
		return
	}
	delete(m.clients, c)
	if len(m.clients) > 0 {
		return
	}
	r.broadcastRoom()
	if r.status == "waiting" {
		time.AfterFunc(rejoinGrace, func() {
			r.mu.Lock()
			defer r.mu.Unlock()
			if m := r.member(c.PlayerID); m != nil && len(m.clients) == 0 && r.status == "waiting" && !r.closed {
				r.removeMember(m.userID)
				r.broadcastRoom()
			}
		})
	}
	if r.connected() == 0 {
		r.scheduleCleanup(emptyRoomTTL)
	}
}

// leave takes a player off the table for good and closes their connections.
func (r *Room) leave(userID string) {
	m := r.member(userID)
	if m == nil {
		return
	}
	for c := range m.clients {
		c.shutdown()
	}
	r.removeMember(userID)
	r.broadcastRoom()
	if r.connected() == 0 {
		r.scheduleCleanup(emptyRoomTTL)
	}
}

func (r *Room) member(userID string) *member {
	for _, m := range r.members {
		if m.userID == userID {
			return m
		}
	}
	return nil
}

// removeMember frees a player's seat; if they hosted, the next player hosts.
func (r *Room) removeMember(userID string) {
	for i, m := range r.members {
		if m.userID == userID {
			r.members = append(r.members[:i], r.members[i+1:]...)
			break
		}
	}
	if r.hostID == userID {
		r.hostID = ""
		for _, m := range r.members {
			if !m.isBot {
				r.hostID = m.userID
				break
			}
		}
	}
}

// addBot seats a bot in the next free seat (poker, host only). At a game in
// play it is dealt in from the next hand.
func (r *Room) addBot(userID string) error {
	if r.GameType != "poker" {
		return errors.New("bots only play poker")
	}
	if userID != r.hostID {
		return errors.New("only the host can add bots")
	}
	if len(r.members) >= models.MaxRoomPlayers {
		return fmt.Errorf("the table is full (%d players)", models.MaxRoomPlayers)
	}
	name := ""
	for _, n := range botNames {
		if !r.nameTaken(n) {
			name = n
			break
		}
	}
	r.botSeq++
	r.members = append(r.members, &member{
		userID: fmt.Sprintf("bot-%d", r.botSeq), name: name, isBot: true,
		chips: game.BotStack(game.DefaultBigBlind), clients: map[*Client]bool{},
	})
	r.broadcastRoom()
	return nil
}

// removeBot takes a bot off the table (host only). A bot in the hand in play
// finishes it.
func (r *Room) removeBot(userID, botID string) error {
	if userID != r.hostID {
		return errors.New("only the host can remove bots")
	}
	if m := r.member(botID); m == nil || !m.isBot {
		return errors.New("no such bot")
	}
	r.removeMember(botID)
	r.broadcastRoom()
	return nil
}

func (r *Room) nameTaken(name string) bool {
	for _, m := range r.members {
		if m.name == name {
			return true
		}
	}
	return false
}

func (r *Room) connected() int {
	n := 0
	for _, m := range r.members {
		if len(m.clients) > 0 {
			n++
		}
	}
	return n
}

// start begins play; only the host may.
func (r *Room) start(userID string) error {
	if r.status == "playing" {
		return errors.New("the game has already started")
	}
	if userID != r.hostID {
		return errors.New("only the host can start the game")
	}
	if r.GameType == "poker" && len(r.members) < 2 {
		return errPokerPlayers
	}
	r.status = "playing"
	r.setStatus("playing")
	r.broadcastRoom()
	if err := r.startRound(); err != nil {
		r.stopPlaying()
		return err
	}
	return nil
}

// stopPlaying sends the table back to the waiting room.
func (r *Room) stopPlaying() {
	r.status = "waiting"
	r.state = nil
	r.stopTimer()
	r.setStatus("waiting")
	r.broadcastRoom()
}

func (r *Room) setStatus(status string) {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	if err := models.SetRoomStatus(ctx, r.hub.db, r.ID, status); err != nil {
		log.Printf("room %s: set status: %v", r.Code, err)
	}
}

// startRound deals a new round to everyone still at the table, each with
// their current balance.
func (r *Room) startRound() error {
	r.state = nil
	r.stopTimer()
	// Players who dropped out during the last round give up their seats.
	// Bots that went broke leave too.
	for _, m := range append([]*member{}, r.members...) {
		if (!m.isBot && len(m.clients) == 0) || (m.isBot && m.chips <= 0) {
			r.removeMember(m.userID)
		}
	}
	if r.connected() == 0 {
		return errors.New("nobody is at the table")
	}
	if r.GameType == "poker" && len(r.members) < 2 {
		return errPokerPlayers
	}

	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	players := make([]models.Player, len(r.members))
	for i, m := range r.members {
		if m.isBot {
			players[i] = models.Player{ID: m.userID, Name: m.name, Chips: m.chips, IsBot: true, IsConnected: true}
			continue
		}
		user, err := models.GetUserByID(ctx, r.hub.db, m.userID)
		if err != nil {
			log.Printf("room %s: load user: %v", r.Code, err)
			return errSomethingWrong
		}
		m.name, m.chips = user.DisplayName, user.Chips
		players[i] = models.Player{ID: m.userID, Name: m.name, Chips: user.Chips, IsConnected: true}
	}

	settings := map[string]any{"fillBots": false}
	if r.dealer >= 0 {
		settings["dealerIndex"] = r.dealer
	}
	state, err := r.engine.StartGame(players, settings)
	if err != nil {
		return err
	}
	if poker, ok := state.(*game.PokerState); ok {
		r.dealer = poker.DealerIndex + 1
	}
	gameID, err := models.CreateRoomGame(ctx, r.hub.db, r.ID, r.GameType, state)
	if err != nil {
		log.Printf("room %s: create game: %v", r.Code, err)
		return errSomethingWrong
	}
	r.gameID = gameID
	r.results = nil
	r.stakes = make(map[string]int64, len(players))
	for _, p := range players {
		if !p.IsBot {
			r.stakes[p.ID] = p.Chips
		}
	}
	// Everyone sees who is in this round and their current chips.
	r.broadcastRoom()
	// Starting can already move chips (poker blinds).
	return r.commit(state, "start")
}

func (r *Room) act(userID string, a models.Action) error {
	if r.state == nil {
		return errors.New("the game hasn't started")
	}
	if r.engine.IsRoundOver(r.state) {
		return errors.New("this round is over; the next one starts shortly")
	}
	if _, playing := r.stakes[userID]; !playing {
		return errors.New("you're in from the next round")
	}
	return r.transition(func(s any) (any, error) { return r.engine.HandleAction(s, userID, a) }, a.Type)
}

// transition applies a change to the round. Engines change the state in
// place, so if the change (or saving it) fails the state is restored.
func (r *Room) transition(change func(any) (any, error), what string) error {
	snapshot, err := json.Marshal(r.state)
	if err != nil {
		return err
	}
	next, err := change(r.state)
	if err == nil {
		err = r.commit(next, what)
	}
	if err != nil {
		if restored, lerr := r.engine.LoadState(snapshot); lerr == nil {
			r.state = restored
		}
		return err
	}
	return nil
}

// commit settles a new state: resolves the round if it is over, applies the
// chips each player won or lost since the last commit to their balance, saves
// the game, then shows the state to the table.
func (r *Room) commit(state any, what string) error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	tx, err := r.hub.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("room %s: begin: %v", r.Code, err)
		return errSomethingWrong
	}
	defer tx.Rollback()

	over := r.engine.IsRoundOver(state)
	var results map[string]*models.ChipChange
	if over {
		var changes []models.ChipChange
		if state, changes, err = r.engine.ResolveRound(state); err != nil {
			return err
		}
		results = make(map[string]*models.ChipChange, len(changes))
		for i := range changes {
			results[changes[i].PlayerID] = &changes[i]
		}
	}

	balances := map[string]int64{}
	for id, before := range r.stakes {
		delta := r.engine.PlayerChips(state, id) - before
		if delta == 0 {
			continue
		}
		balance, err := models.ApplyChipChange(ctx, tx, id, r.gameID, delta, fmt.Sprintf("%s online: %s", r.GameType, what))
		if errors.Is(err, models.ErrInsufficientChips) {
			return errNotEnoughChips
		}
		if err != nil {
			log.Printf("room %s: apply chips: %v", r.Code, err)
			return errSomethingWrong
		}
		balances[id] = balance
	}
	if err := models.SaveGame(ctx, tx, r.gameID, state, over); err != nil {
		log.Printf("room %s: save game: %v", r.Code, err)
		return errSomethingWrong
	}
	if err := tx.Commit(); err != nil {
		log.Printf("room %s: commit: %v", r.Code, err)
		return errSomethingWrong
	}

	r.state = state
	for id := range r.stakes {
		r.stakes[id] = r.engine.PlayerChips(state, id)
	}
	for id, balance := range balances {
		if m := r.member(id); m != nil {
			m.chips = balance
		}
	}
	// Bots' stacks live only here; they keep what they won for the next hand.
	for _, m := range r.members {
		if m.isBot && over {
			if chips, in := r.botChips(state, m.userID); in {
				m.chips = chips
			}
		}
	}
	if over {
		r.results = results
	}
	r.armTimer()
	r.broadcastGame()
	return nil
}

// botChips returns a bot's stack in the round, if it is playing in it.
func (r *Room) botChips(state any, id string) (int64, bool) {
	if poker, ok := state.(*game.PokerState); ok {
		for _, p := range poker.Players {
			if p.ID == id {
				return p.Chips, true
			}
		}
	}
	return 0, false
}

// armTimer starts the clock for what the round now waits on: the next round
// once it is over, otherwise the bets or the turn in play. A decision that
// is still the same keeps its clock running.
func (r *Room) armTimer() {
	if r.engine.IsRoundOver(r.state) {
		r.setTimer("next", nextRoundDelay[r.GameType], r.nextRound)
		return
	}
	w, ok := r.engine.Waiting(r.state)
	if !ok {
		r.stopTimer()
		return
	}
	if w.Key == r.waitKey && r.timer != nil {
		return
	}
	d := turnTime
	if w.Betting {
		d = betTime
	}
	r.setTimer(w.Key, d, r.timeout)
}

func (r *Room) setTimer(key string, d time.Duration, fire func()) {
	r.stopTimer()
	r.waitKey = key
	r.deadline = time.Now().Add(d)
	gen := r.timerGen
	r.timer = time.AfterFunc(d, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		if r.closed || gen != r.timerGen {
			return
		}
		r.timer = nil
		fire()
	})
}

func (r *Room) stopTimer() {
	if r.timer != nil {
		r.timer.Stop()
		r.timer = nil
	}
	r.timerGen++
	r.waitKey = ""
	r.deadline = time.Time{}
}

// timeout decides for whoever is too slow.
func (r *Room) timeout() {
	if r.state == nil {
		return
	}
	if err := r.transition(r.engine.Timeout, "timeout"); err != nil {
		log.Printf("room %s: timeout: %v", r.Code, err)
		r.setTimer("retry", 5*time.Second, r.timeout)
	}
}

func (r *Room) nextRound() {
	if r.status != "playing" {
		return
	}
	if err := r.startRound(); err != nil {
		r.stopPlaying()
		r.broadcast(encode(MsgError, ErrorInfo{Message: "The game stopped: " + err.Error()}))
	}
}

func (r *Room) broadcast(data []byte) {
	for _, m := range r.members {
		for c := range m.clients {
			c.queue(data)
		}
	}
}

func (r *Room) broadcastRoom() {
	r.broadcast(encode(MsgRoomState, r.info()))
}

func (r *Room) broadcastGame() {
	for _, m := range r.members {
		r.sendGame(m)
	}
}

// sendGame sends the round in play to one player, as they may see it.
func (r *Room) sendGame(m *member) {
	if r.state == nil || len(m.clients) == 0 {
		return
	}
	u := GameUpdate{GameID: r.gameID, State: r.engine.GetStateForPlayer(r.state, m.userID), Chips: m.chips, Result: r.results[m.userID]}
	if !r.deadline.IsZero() {
		u.TimeLeft = max(1, time.Until(r.deadline).Milliseconds())
		switch {
		case r.waitKey == "next", r.waitKey == "bets":
			u.Clock = r.waitKey
		case strings.HasPrefix(r.waitKey, "turn"):
			u.Clock = "turn"
		}
	}
	data := encode(MsgGameState, u)
	for c := range m.clients {
		c.queue(data)
	}
}

// scheduleCleanup closes the room after d unless someone is connected by then.
func (r *Room) scheduleCleanup(d time.Duration) {
	if r.cleanup != nil {
		r.cleanup.Stop()
	}
	r.cleanup = time.AfterFunc(d, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		if !r.closed && r.connected() == 0 {
			r.close()
		}
	})
}

func (r *Room) close() {
	r.closed = true
	r.stopTimer()
	for _, m := range r.members {
		for c := range m.clients {
			c.shutdown()
		}
	}
	r.hub.remove(r)
	r.setStatus("finished")
	log.Printf("room %s closed", r.Code)
}
