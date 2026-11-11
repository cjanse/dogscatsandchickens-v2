import type { Deck } from "../deck/Deck";
import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";

const STARTING_CREATURES = 3;
const STARTING_EXTRA_CARDS = 2;

/** Deals a player 3 creature cards from the deck (fewer if the deck has fewer creatures). */
export function dealStartingCreatures(deck: Deck, player: Player): void {
  for (let i = 0; i < STARTING_CREATURES; i++) {
    const card = deck.drawWhere(candidate => candidate.type === "creature");
    if (!card) break;
    player.addToHand(card);
  }
}

/** Deals a player 2 more cards from the top of the deck (fewer if the deck runs out). */
export function dealStartingExtraCards(deck: Deck, player: Player): void {
  for (let i = 0; i < STARTING_EXTRA_CARDS; i++) {
    const card = deck.draw();
    if (!card) break;
    player.addToHand(card);
  }
}

/**
 * The opening deal, as in GAME_RULES_V1.md: shuffle, each player takes 3 creatures at random, shuffle
 * again, and each player draws 2 more cards. Every player ends up with a 5-card hand.
 */
export function setUpGame(game: GameBoard): void {
  game.deck.shuffle();
  for (const player of game.players) {
    dealStartingCreatures(game.deck, player);
  }

  game.deck.shuffle();
  for (const player of game.players) {
    dealStartingExtraCards(game.deck, player);
  }
}
