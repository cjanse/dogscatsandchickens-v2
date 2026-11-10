import type { Card } from "../cards/Card";
import type { TemporaryEffect } from "./GameBoard";

/**
 * Read-only shapes of the model, for the views. The live objects implement them,
 * so there is no copying, but TypeScript rejects any attempt to change them.
 * Everything that changes the game goes through GameController.
 */

export type FieldView = readonly (readonly (Card | null)[])[];

export interface DeckView {
  readonly size: number;
  /** The card that would be drawn next, without drawing it. */
  peek(): Card | undefined;
}

export interface PlayerView {
  readonly id: number;
  readonly hand: readonly Card[];
  readonly field: FieldView;
  readonly turnCount: number;
  readonly isAI: boolean;
}

export interface GameView {
  readonly players: readonly PlayerView[];
  readonly currentPlayer: PlayerView;
  readonly currentPlayerIndex: number;
  readonly deck: DeckView;
  readonly discardPile: readonly Card[];
  readonly temporaryEffects: readonly TemporaryEffect[];
}
