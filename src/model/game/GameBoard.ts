import type { Deck } from "../deck/Deck";
import type { Player } from "./Player";

export class GameBoard {
  readonly players: Player[];
  readonly deck: Deck;
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
}