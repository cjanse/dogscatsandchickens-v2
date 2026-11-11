import type { CreatureCard } from "../cards/CreatureCard";
import type { GameView, PlayerView } from "../game/views";
import type { CreatureType } from "../types/CreatureType";
import type { GameResult } from "../types/GameResult";
import { isPlayableCard } from "./Actions";

/**
 * When the game is over. Each check returns the `GameResult` it finds, or `{ state: "ongoing" }`.
 * The controller decides when to run them (at the end of a turn) and records the result.
 */

const ONGOING: GameResult = { state: "ongoing" };

/** True if the player has at least one creature on their field. */
export function playerHasCreatures(player: PlayerView): boolean {
  return player.field.some(row => row.some(card => card?.type === "creature"));
}

/** True if the creatures on both fields all share one creature type (or there are none). */
export function allCreaturesSameType(game: GameView): boolean {
  const creatureTypes = new Set<CreatureType>();

  for (const player of game.players) {
    for (const row of player.field) {
      for (const card of row) {
        if (card?.type === "creature") {
          creatureTypes.add((card as CreatureCard).creatureType);
        }
      }
    }
  }

  return creatureTypes.size <= 1;
}

/** A player with no creatures on the field loses. */
export function lossResult(player: PlayerView): GameResult {
  return playerHasCreatures(player) ? ONGOING : { state: "loss", loserId: player.id };
}

/**
 * A tie: nobody can draw, the creatures left are all the same type, and neither player has a card in
 * hand that could still be played (see `isPlayableCard`). Both hands are checked, whoever's turn it is.
 */
export function tieResult(game: GameView): GameResult {
  const noCardsToDraw = game.deck.size === 0;
  const noPlayableHands = game.players.every(
    player => !player.hand.some(card => isPlayableCard(game, player, card))
  );

  return noCardsToDraw && allCreaturesSameType(game) && noPlayableHands
    ? { state: "tie" }
    : ONGOING;
}
