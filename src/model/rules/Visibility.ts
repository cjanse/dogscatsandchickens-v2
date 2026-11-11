import type { Card } from "../cards/Card";
import type { GameView, PlayerView } from "../game/views";

/**
 * Whether `viewer` can see the front of `card`, which belongs to `owner` (in their hand or on their field).
 * - You always see your own cards.
 * - A card that is face up on the field is visible to everyone.
 * - A Messy Dorm reveal shows the target's hand, only to the player who played it.
 */
export function isCardVisible(game: GameView, card: Card, owner: PlayerView, viewer: PlayerView): boolean {
  if (owner.id === viewer.id) return true;
  if (card.facedUp) return true;

  const handRevealed = game.temporaryEffects.some(
    e => e.type === "revealHand" && e.targetPlayerId === owner.id && e.sourcePlayerId === viewer.id
  );
  return handRevealed && owner.hand.includes(card);
}
