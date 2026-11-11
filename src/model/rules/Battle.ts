import type { CreatureCard } from "../cards/CreatureCard";
import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import { attackerWins, defenderWins } from "./Matchup";
import { revealCreature } from "./Matching";
import { resolveUpgradeStack } from "./Upgrades";

/** A creature in a battle, and the field row it sits in. */
export interface Combatant {
  player: Player;
  row: number;
  card: CreatureCard;
}

export type BattleOutcome =
  | "attackerWon"    // the defender was defeated (its upgrades didn't save it)
  | "defenderSaved"  // the attacker's type won, but an upgrade saved the defender
  | "defenderWon"    // the attacker was defeated; its own upgrades don't help
  | "standoff";      // same type: nothing happens

/**
 * Flips both creatures face up and resolves the attack. A face-down matched pair flips both cards and
 * activates, before the types are compared (so a hidden matched Dog attacking a Dog wins).
 */
export function resolveBattle(board: GameBoard, attacker: Combatant, defender: Combatant): BattleOutcome {
  revealCreature(board, attacker.player, attacker.row);
  revealCreature(board, defender.player, defender.row);

  if (attackerWins(attacker.card, defender.card)) {
    if (resolveUpgradeStack(board, defender, attacker)) {
      return "defenderSaved";
    }
    board.discardRow(defender.player, defender.row);
    return "attackerWon";
  }

  if (defenderWins(attacker.card, defender.card)) {
    board.discardRow(attacker.player, attacker.row);
    return "defenderWon";
  }

  return "standoff";
}
