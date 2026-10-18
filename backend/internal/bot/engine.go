package bot

import "casino/internal/game"

// NewEngine returns the engine for a game type with its bots attached.
func NewEngine(gameType string) (game.GameEngine, bool) {
	engine, ok := game.NewEngine(gameType)
	if poker, isPoker := engine.(*game.PokerEngine); isPoker {
		poker.Bot = NewPokerBot()
	}
	return engine, ok
}
