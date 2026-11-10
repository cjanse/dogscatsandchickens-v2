import type { CreatureCard } from "../cards/CreatureCard";
import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";

/** Runs when `card` has just been matched on `owner`'s field. */
export function activateMatchedAbility(board: GameBoard, owner: Player, card: CreatureCard): void {
  switch (card.matchingAbilityType) {
    case "seeEverything":
      // Chicken: every card on the opponent's field flips face up
      for (const row of board.opponentOf(owner).field) {
        for (const fieldCard of row) {
          if (fieldCard) fieldCard.facedUp = true;
        }
      }
      break;
    case "multipleAttacks": // Cat: see canAttackAgain
    case "alwaysWin":       // Dog: see attackerWins in Matchup.ts
      break;
  }
}

/** A matched Cat may keep attacking after its first attack this turn. */
export function canAttackAgain(creature: CreatureCard): boolean {
  return creature.matched && creature.creatureType === "cat";
}
