import type { Card } from "../cards/Card";
import type { Deck } from "../deck/Deck";
import type { GameResult } from "../types/GameResult";
import type { Player } from "./Player";
import { TurnState } from "./TurnState";

//Types
export type TemporaryEffect =
| { type: "revealHand"; sourcePlayerId: number; targetPlayerId: number;};

/** A player's very first turn allows a single move. */
export const FIRST_TURN_MOVES = 1;
export const MOVES_PER_TURN = 2;

export class GameBoard {
  temporaryEffects: TemporaryEffect[] = [];
  readonly players: Player[];
  readonly deck: Deck;
  readonly discardPile: Card[] = [];
  currentPlayerIndex: number;
  readonly turn: TurnState = new TurnState();
  result: GameResult = { state: "ongoing" };

  constructor(players: Player[], deck: Deck) {
    this.players = players;
    this.deck = deck;
    this.currentPlayerIndex = 0;
  }

  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  get maxMovesPerTurn(): number {
    return this.currentPlayer.turnCount === 0 ? FIRST_TURN_MOVES : MOVES_PER_TURN;
  }

  get movesLeft(): number {
    return this.maxMovesPerTurn - this.turn.movesThisTurn;
  }

  get isGameOver(): boolean {
    return this.result.state !== "ongoing";
  }

  endGame(result: GameResult): void {
    this.result = result;
  }

  /** Ends the current player's turn: counts it, passes play to the next player, and starts a fresh turn. */
  nextTurn() {
    this.currentPlayer.turnCount++;
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
    this.turn.reset();
  }

  discard(card: Card) {
    this.discardPile.push(card);
  }

  getDiscardPile(): Card[] {
    return this.discardPile;
  }
}
