import type { UpgradeCard } from "../cards/UpgradeCard";
import type { GameBoard } from "../game/GameBoard";
import type { Combatant } from "./Battle";
import { typeBeats } from "./Matchup";

/**
 * Runs when `loser`'s creature would be defeated by `winner`. Triggers the loser's upgrades from
 * the top of the stack (col 3) down, stopping once the creature is saved or a Revive/Self-Destruct
 * fires. Returns true if the creature survives.
 *
 * Every triggered upgrade leaves the field. A triggered Fake Upgrade returns to its owner's hand,
 * unless a Revive or Self-Destruct also fired in the same stack, in which case it is discarded.
 * Upgrades that never triggered stay put (creature saved) or go down with the row.
 */
export function resolveUpgradeStack(board: GameBoard, loser: Combatant, winner: Combatant): boolean {
  const triggeredCols: number[] = [];
  let creatureSurvives = false;
  let stackIsDestroyed = false;

  for (const col of [3, 2]) {
    const upgrade = loser.player.field[loser.row][col] as UpgradeCard | null;
    if (!upgrade) continue;

    triggeredCols.push(col);
    creatureSurvives = activateUpgrade(board, upgrade, loser, winner);
    if (creatureSurvives) break;
    // Self-Destruct and Revive do not stack
    if (upgrade.upgradeType === "selfDestruct" || upgrade.upgradeType === "revive") {
      stackIsDestroyed = true;
      break;
    }
  }

  for (const col of triggeredCols) {
    const upgrade = loser.player.field[loser.row][col] as UpgradeCard;
    const returnsToHand = upgrade.upgradeType === "fakeUpgrade" && !stackIsDestroyed;
    const removed = loser.player.removeFromField(loser.row, col);
    if (!removed) continue;
    if (returnsToHand) {
      loser.player.addToHand(removed);
    } else {
      board.discard(removed);
    }
  }

  return creatureSurvives;
}

/** Applies one upgrade's effect. Returns true if it saves the creature. */
function activateUpgrade(board: GameBoard, upgrade: UpgradeCard, loser: Combatant, winner: Combatant): boolean {
  switch (upgrade.upgradeType) {
    case "defense":
      return true;
    case "counterAttack":
      // Also defeats the attacker when the defender's type beats it. This can't happen while the
      // matched Dog only gains the Dog-vs-Dog win (see CLAUDE.md), since an attacker then only
      // wins on type or as a matched Dog against a Dog.
      if (typeBeats(loser.card.creatureType, winner.card.creatureType)) {
        board.discardRow(winner.player, winner.row);
      }
      return true;
    case "fakeUpgrade":
      return false;
    case "selfDestruct":
      board.discardRow(winner.player, winner.row);
      return false;
    case "revive":
      // The creature (both cards of a matched pair) goes back to its owner's hand
      for (const col of [0, 1]) {
        const card = loser.player.removeFromField(loser.row, col);
        if (card) loser.player.addToHand(card);
      }
      return false;
  }
}
