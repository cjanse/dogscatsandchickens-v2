import type { PlayerView } from "../game/views";

/** A player must discard down to this many cards before ending their turn. */
export const HAND_LIMIT = 5;

export function isOverHandLimit(player: PlayerView): boolean {
  return player.hand.length > HAND_LIMIT;
}
