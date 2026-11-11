import type { CreatureCard } from "../cards/CreatureCard";
import type { GameBoard } from "../game/GameBoard";
import type { CardView, PlayerView } from "../game/views";
import { playerHasCreatures } from "./GameEnd";
import { canAttackAgain } from "./Matching";

/**
 * The turn structure: what a turn allows, depending on how far into it the player is.
 * The move limit itself is `GameBoard.maxMovesPerTurn`. The controller adds what only matters
 * right now (the game is over, it's the AI's turn, a card is waiting for its target).
 */

/** A player's first turn: one move, no draw, no attack, and only a creature may be played. */
export function isFirstTurn(player: PlayerView): boolean {
  return player.turnCount === 0;
}

/** First turn: only a creature may be played. Any card is allowed after that. */
export function firstTurnAllows(player: PlayerView, card: CardView): boolean {
  return !isFirstTurn(player) || card.type === "creature";
}

/**
 * Whether the current player may draw now. A draw costs no move and happens once a turn, never on a
 * first turn or from an empty deck. On a recovery turn (no creatures on the field) it only becomes
 * available once the player has put a creature down.
 */
export function canDraw(game: GameBoard): boolean {
  const player = game.currentPlayer;
  return !game.turn.hasDrawn &&
    game.deck.size > 0 &&
    !isFirstTurn(player) &&
    playerHasCreatures(player);
}

/**
 * Whether the current player's `creature` may start an attack. An attack must be the first move of the
 * turn, except that a matched Cat may attack again after its attack. Never on a first turn.
 */
export function canStartAttack(game: GameBoard, creature: CreatureCard): boolean {
  if (isFirstTurn(game.currentPlayer)) return false;
  const turn = game.turn;
  return turn.movesThisTurn === 0 || (turn.allowExtraAttack && canAttackAgain(creature));
}
