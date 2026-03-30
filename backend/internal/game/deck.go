package game

import (
	"math/rand"

	"casino/internal/models"
)

var suits = []string{"hearts", "diamonds", "clubs", "spades"}
var ranks = []string{"2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"}

// NewDeck returns a single shuffled 52-card deck.
func NewDeck() []models.Card {
	deck := make([]models.Card, 0, 52)
	for _, s := range suits {
		for _, r := range ranks {
			deck = append(deck, models.Card{Suit: s, Rank: r})
		}
	}
	shuffle(deck)
	return deck
}

// NewShoe returns n shuffled decks combined (used by blackjack).
func NewShoe(n int) []models.Card {
	shoe := make([]models.Card, 0, 52*n)
	for i := 0; i < n; i++ {
		shoe = append(shoe, NewDeck()...)
	}
	shuffle(shoe)
	return shoe
}

func shuffle(deck []models.Card) {
	rand.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})
}

// Draw removes and returns the top card from the deck.
func Draw(deck *[]models.Card) models.Card {
	card := (*deck)[0]
	*deck = (*deck)[1:]
	return card
}
