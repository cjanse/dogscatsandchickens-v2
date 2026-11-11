import type { CreatureCard } from "../cards/CreatureCard";
import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { MatchingAbilityType } from "../types/MatchingAbilityType";

/**
 * Matched pairs. A creature and its identical twin in cols 0 and 1 of a row are a pair (`matched`).
 * A pair's ability is active exactly when the pair is face up: it stays face down until its owner
 * activates it, unless the bottom creature was already face up when the twin was placed.
 *
 * Invariant: both cards of a pair are always face up together. Pair cards are only revealed through
 * `revealCreature` and `activatePair`, never with a bare `reveal()`.
 */

/** Two twins placed on top of each other: `twin` was already on the field, `card` was just played onto it. */
export interface MatchedPair {
  card: CreatureCard;
  twin: CreatureCard;
}

/** Whether `card` belongs to a pair whose ability is on (the pair is matched and face up). */
export function isAbilityActive(card: CreatureCard): boolean {
  return card.matched && card.facedUp;
}

/** The matched pair in `row` of `owner`'s field, or null if that row holds no pair. */
function pairAt(owner: Player, row: number): [CreatureCard, CreatureCard] | null {
  const bottom = owner.field[row]?.[0];
  const top = owner.field[row]?.[1];
  if (bottom?.type !== "creature" || top?.type !== "creature") return null;
  const pair = [bottom as CreatureCard, top as CreatureCard] as [CreatureCard, CreatureCard];
  return pair[0].matched && pair[1].matched ? pair : null;
}

/** The ability of the matched pair in `row` of `owner`'s field, or null if that row holds no pair. */
export function pairAbility(owner: Player, row: number): MatchingAbilityType | null {
  return pairAt(owner, row)?.[0].matchingAbilityType ?? null;
}

/**
 * Records a new pair after `match.card` was placed on `match.twin`. The pair stays face down, unless
 * the twin underneath was already face up: then the ability activates at once.
 */
export function formPair(board: GameBoard, owner: Player, match: MatchedPair): void {
  match.card.matched = true;
  match.twin.matched = true;
  if (match.twin.facedUp) {
    const row = owner.field.findIndex(r => r.includes(match.card));
    if (row !== -1) activatePair(board, owner, row);
  }
}

/** Whether `row` of `owner`'s field holds a pair that is still face down, so it can be activated. */
export function canActivatePair(owner: Player, row: number): boolean {
  const pair = pairAt(owner, row);
  return !!pair && !pair.every(card => card.facedUp);
}

/**
 * Activates the face-down pair in `row`: both cards flip face up and its one-time effect runs.
 * Returns false, and does nothing, if there is no pair there or it is already active.
 */
export function activatePair(board: GameBoard, owner: Player, row: number): boolean {
  if (!canActivatePair(owner, row)) return false;
  const pair = pairAt(owner, row)!;
  pair.forEach(card => card.reveal());

  switch (pair[0].matchingAbilityType) {
    case "seeEverything":
      // Chicken: every card on the opponent's field flips face up. A hidden pair there is activated by
      // the flip (face up = active), which can flip this field back once. Each pair activates only once.
      revealField(board, board.opponentOf(owner));
      break;
    case "multipleAttacks": // Cat: see canAttackAgain
    case "alwaysWin":       // Dog: see attackerWins in Matchup.ts
      break;
  }
  return true;
}

/**
 * Flips the creature in `row` face up: both cards if it is a matched pair (which activates it),
 * otherwise the single creature.
 */
export function revealCreature(board: GameBoard, owner: Player, row: number): void {
  if (pairAt(owner, row)) {
    activatePair(board, owner, row);
    return;
  }
  for (const col of [0, 1]) {
    owner.field[row]?.[col]?.reveal();
  }
}

/** Flips every card on `owner`'s field face up. Creatures go through `revealCreature`, so hidden pairs activate. */
function revealField(board: GameBoard, owner: Player): void {
  owner.field.forEach((cells, row) => {
    revealCreature(board, owner, row);
    for (const col of [2, 3]) cells[col]?.reveal();
  });
}

/** A matched Cat whose ability is active may keep attacking after its first attack this turn. */
export function canAttackAgain(creature: CreatureCard): boolean {
  return isAbilityActive(creature) && creature.creatureType === "cat";
}
