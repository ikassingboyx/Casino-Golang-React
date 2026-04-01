package main

import (
	"bufio"
	"casino/internal/config"
	"casino/internal/db"
	"casino/internal/game"
	"casino/internal/handlers"
	"casino/internal/middleware"
	"casino/internal/models"
	"casino/internal/ws"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func runBlackjackConsole() {
	engine := game.NewBlackjackEngine()
	scanner := bufio.NewScanner(os.Stdin)
	player := models.Player{ID: "p1", Name: "Player", Chips: 1000}

	for {
		fmt.Printf("\n--- New Round | Chips: %d ---\n", player.Chips)
		raw, _ := engine.StartGame([]models.Player{player}, nil)

		fmt.Print("Bet: ")
		scanner.Scan()
		amount, _ := strconv.ParseInt(strings.TrimSpace(scanner.Text()), 10, 64)

		raw, err := engine.HandleAction(raw, "p1", models.Action{Type: "bet", Amount: amount})
		if err != nil {
			fmt.Println("Error:", err)
			continue
		}

		for !engine.IsRoundOver(raw) {
			printState(engine.GetStateForPlayer(raw, "p1").(*game.BlackjackState))
			fmt.Print("hit/stand/double: ")
			scanner.Scan()
			raw, _ = engine.HandleAction(raw, "p1", models.Action{Type: strings.TrimSpace(scanner.Text()), Amount: amount})
		}

		raw, changes, _ := engine.ResolveRound(raw)
		printState(raw.(*game.BlackjackState))
		for _, c := range changes {
			fmt.Printf("Result: %+d chips\n", c.Amount)
		}
		player.Chips = raw.(*game.BlackjackState).Players[0].Chips

		fmt.Print("Play again? (y/n): ")
		scanner.Scan()
		if strings.TrimSpace(scanner.Text()) != "y" {
			break
		}
	}
}

func printState(s *game.BlackjackState) {
	fmt.Print("Dealer: ")
	for _, c := range s.DealerHand.Cards {
		if c.Hidden {
			fmt.Print("[?] ")
		} else {
			fmt.Printf("[%s%s] ", c.Rank, c.Suit[:1])
		}
	}
	fmt.Println()
	fmt.Print("You:    ")
	for _, c := range s.Players[0].Hands[0].Cards {
		fmt.Printf("[%s%s] ", c.Rank, c.Suit[:1])
	}
	fmt.Printf("(%s)\n", s.Players[0].Hands[0].Status)
}

func main() {
	runBlackjackConsole()
	return

	cfg := config.Load()
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer database.Close()

	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	hub := ws.NewHub()
	go hub.Run()

	r := gin.Default()
	r.Use(middleware.CORS(cfg.FrontendURL))

	handlers.RegisterRoutes(r, database, hub, cfg)

	log.Printf("server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
