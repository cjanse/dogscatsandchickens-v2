import type { CardType } from "../types/CardType";
import type { TemporaryEffect } from "./GameBoard";

/**
 * Read-only shapes of the model, for the views. The live objects implement them,
 * so there is no copying, but TypeScript rejects any attempt to change them.
 * Everything that changes the game goes through GameController.
 */

/**
 * A card as the views see it: nothing in it can be changed. `Card` implements it, so there is no copying.
 * Views must not read `facedUp` to decide what to draw: they ask the controller (`isCardVisibleToPlayer`, `isFaceUp`).
 * When a view hands a card back to the controller, the controller finds the real card by `instanceId`.
 */
export interface CardView {
  readonly id: string;
  readonly name: string;
  readonly type: CardType;
  readonly instanceId: string;
  readonly facedUp: boolean;
}

export type FieldView = readonly (readonly (CardView | null)[])[];

export interface DeckView {
  readonly size: number;
  /** The card that would be drawn next, without drawing it. */
  peek(): CardView | undefined;
}

export interface PlayerView {
  readonly id: number;
  readonly hand: readonly CardView[];
  readonly field: FieldView;
  readonly turnCount: number;
  readonly isAI: boolean;
}

export interface GameView {
  readonly players: readonly PlayerView[];
  readonly currentPlayer: PlayerView;
  readonly currentPlayerIndex: number;
  readonly deck: DeckView;
  readonly discardPile: readonly CardView[];
  readonly temporaryEffects: readonly TemporaryEffect[];
}
