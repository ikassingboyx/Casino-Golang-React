# Card assets

One file per card, named `<suit>-<rank>.svg` (PNG also works; keep one format).
Suit and rank match the values used in code (`src/types/game.ts`).

- Suits: `hearts`, `diamonds`, `clubs`, `spades`
- Ranks: `2` `3` `4` `5` `6` `7` `8` `9` `10` `J` `Q` `K` `A`
- Card back: `back.svg`

Examples: `hearts-A.svg`, `spades-10.svg`, `clubs-K.svg`

52 cards + 1 back = 53 files. Served at `/assets/cards/<file>`.
