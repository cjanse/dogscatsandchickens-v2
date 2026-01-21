import type { Card } from "../cards/Card";
import type { Deck } from "../deck/Deck";
import type { Player } from "./Player";

//Types
export type TemporaryEffect = 
| { type: "revealHand"; sourcePlayerId: number; targetPlayerId: number;};

export class GameBoard {
  temporaryEffects: TemporaryEffect[] = [];
  readonly players: Player[];
  readonly deck: Deck;
  readonly discardPile: Card[] = [];
  currentPlayerIndex: number;

  constructor(players: Player[], deck: Deck) {
    this.players = players;
    this.deck = deck;
    this.currentPlayerIndex = 0;
  }

  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  nextTurn() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  discard(card: Card) {
    this.discardPile.push(card);
  }

  getDiscardPile(): Card[] {
    return this.discardPile;
  }
}