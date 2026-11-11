import type { Card } from "../cards/Card";
import type { Deck } from "../deck/Deck";
import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";

const CARDS_PER_PLAYER = 5;
const MIN_CREATURE_CARDS = 3;

/**
 * Deals a player's opening hand: 5 cards with at least 3 creatures. A hand without enough creatures
 * goes back into the deck, which is reshuffled before the next try. Stops early if the deck runs out.
 */
export function dealStartingHand(deck: Deck, player: Player): void {
  let hand: Card[] = [];
  let creatureCount = 0;

  while (hand.length < CARDS_PER_PLAYER) {
    const card = deck.draw();
    if (!card) break; // No more cards in deck

    hand.push(card);
    card.facedUp = false;

    if (card.type === "creature") {
      creatureCount++;
    }

    if (hand.length === CARDS_PER_PLAYER) {
      if (creatureCount >= MIN_CREATURE_CARDS) break;

      // Not enough creatures: put the cards back and try again
      for (let i = hand.length - 1; i >= 0; i--) {
        deck.putCardBack(hand[i]);
      }
      hand = [];
      creatureCount = 0;
      deck.shuffle();
    }
  }

  for (const card of hand) {
    player.addToHand(card);
  }
}

/** Shuffles the deck and deals every player their opening hand. */
export function setUpGame(game: GameBoard): void {
  game.deck.shuffle();
  for (const player of game.players) {
    dealStartingHand(game.deck, player);
  }
}
