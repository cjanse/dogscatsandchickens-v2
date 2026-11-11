import type { Card } from "../cards/Card";
import type { ActionCard } from "../cards/ActionCard";
import type { GameBoard, TemporaryEffect } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { GameView, PlayerView } from "../game/views";
import type { CardType } from "../types/CardType";
import { hasUpgradeSlot } from "./Placement";

/**
 * What the action cards do, and when they can do anything. The controller decides when an action
 * resolves (it holds the pending action and the selected card), charges the move and discards the card.
 */

/** Which kind of card each Spirit brings back from the discard pile, by card id. */
const SPIRIT_REVIVES: Record<string, CardType> = {
  Beach_Spirits: "upgrade",
  Forest_Spirits: "creature",
  River_Spirits: "action",
};

/** The kind of card a Spirit takes from the discard pile, or null for any other card. */
export function reviveKind(card: Card): CardType | null {
  if (card.type !== "action" || (card as ActionCard).actionType !== "spirit") return null;
  return SPIRIT_REVIVES[card.id] ?? null;
}

/** An action can only be played when it can actually do something. */
export function canPlayAction(game: GameView, player: PlayerView, card: ActionCard): boolean {
  const opponent = opponentView(game, player);
  switch (card.actionType) {
    case "powerOfTea":
      return opponent.field.some(row => row.some(fieldCard => fieldCard !== null && !fieldCard.facedUp));
    case "messyDorm":
      return true;
    case "birdArmy":
      return opponent.hand.length > 0;
    case "spirit": {
      const kind = reviveKind(card);
      return kind !== null && game.discardPile.some(c => c.type === kind);
    }
  }
}

/**
 * Whether a card in `player`'s hand could be played at all, ignoring whose turn it is and the moves left:
 * a creature always can, an upgrade needs a free slot, an action needs something to act on.
 */
export function isPlayableCard(game: GameView, player: PlayerView, card: Card): boolean {
  switch (card.type) {
    case "creature":
      return true;
    case "upgrade":
      return hasUpgradeSlot(player);
    case "action":
      return canPlayAction(game, player, card as ActionCard);
  }
}

// Spirits

/** Whether the Spirit `card` can take `target` from the discard pile. */
export function canRevive(card: Card, target: Card): boolean {
  const kind = reviveKind(card);
  return kind !== null && target.type === kind;
}

/** Moves `target` from the discard pile into `player`'s hand. Returns false if it isn't in the discard pile. */
export function revive(board: GameBoard, player: Player, target: Card): boolean {
  const card = board.takeFromDiscard(target);
  if (!card) return false;
  player.addToHand(card);
  return true;
}

// Bird Army

/**
 * Moves a random card of `kind` from `victim`'s hand to `thief`'s hand and returns it,
 * or returns null if the victim has no card of that kind. `random` returns a number in [0, 1).
 */
export function stealRandomCard(
  thief: Player,
  victim: Player,
  kind: CardType,
  random: () => number = Math.random
): Card | null {
  const candidates = victim.hand.filter(c => c.type === kind);
  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(random() * candidates.length)];
  const stolen = victim.removeFromHand(pick.instanceId);
  if (!stolen) return null;
  thief.addToHand(stolen);
  return stolen;
}

// Power of Tea

/** Power of Tea flips one face-down card on the opponent's field. */
export function canRevealWithTea(owner: PlayerView, row: number, col: number): boolean {
  const target = owner.field[row]?.[col];
  return !!target && !target.facedUp;
}

/** Flips the card at (row, col) on `owner`'s field face up. */
export function revealWithTea(owner: Player, row: number, col: number): void {
  const target = owner.field[row]?.[col];
  if (target) target.reveal();
}

// Messy Dorm

/** Messy Dorm: `source` sees their opponent's hand until the reveal ends. `dorm` is the card that was played. */
export function startHandReveal(board: GameBoard, source: Player, dorm: Card): void {
  board.addTemporaryEffect({
    type: "revealHand",
    sourcePlayerId: source.id,
    targetPlayerId: board.opponentOf(source).id,
    cardInstanceId: dorm.instanceId,
  });
}

/** Ends the hand reveal `player` started, if there is one, and returns it so the caller can discard its card. */
export function endHandReveal(board: GameBoard, player: Player): TemporaryEffect | undefined {
  const effect = board.temporaryEffects.find(e => e.type === "revealHand" && e.sourcePlayerId === player.id);
  if (effect) board.removeTemporaryEffect(effect);
  return effect;
}

function opponentView(game: GameView, player: PlayerView): PlayerView {
  const index = game.players.findIndex(p => p.id === player.id);
  return game.players[(index + 1) % game.players.length];
}
