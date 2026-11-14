import type { CardView, GameView, PlayerView } from "../game/views";

/**
 * Whether `viewer` can see the front of `card`, which belongs to `owner` (in their hand or on their field).
 * - You always see your own cards.
 * - A card that is face up on the field is visible to everyone.
 * - A Messy Dorm reveal shows the target's hand, only to the player who played it.
 */
export function isCardVisible(game: GameView, card: CardView, owner: PlayerView, viewer: PlayerView): boolean {
  if (owner.id === viewer.id) return true;
  if (card.facedUp) return true;

  return isHandRevealed(game, owner, viewer) && owner.hand.includes(card);
}

/** Whether a Messy Dorm reveal that `viewer` played currently shows `owner`'s hand to them. */
export function isHandRevealed(game: GameView, owner: PlayerView, viewer: PlayerView): boolean {
  return game.temporaryEffects.some(
    e => e.type === "revealHand" && e.targetPlayerId === owner.id && e.sourcePlayerId === viewer.id
  );
}
