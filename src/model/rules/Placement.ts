import type { Player } from "../game/Player";
import type { CardView, PlayerView } from "../game/views";

/**
 * Field rows are `[creature, matchingTwin, upgrade (bottom), upgrade (top)]`.
 * These checks only cover the slot. Whose turn it is and how many moves are left are checked by the controller.
 */

/**
 * A row to play into: an existing row, or a new one above (`-1`) or below (`field.length`) the rest.
 * An empty field has just the one new row, at 0.
 */
export function isPlaceableRow(player: Player, row: number): boolean {
  const rowCount = player.field.length;
  return (row >= 0 && row <= rowCount) || (row === -1 && rowCount > 0);
}

/** A creature goes in col 0 or 1, into an empty slot, and only next to its own twin. */
export function canPlaceCreature(player: Player, card: CardView, row: number, col: number): boolean {
  if (!isPlaceableRow(player, row)) return false;
  if (col !== 0 && col !== 1) return false;
  if (player.field[row]?.[col]) return false;

  const otherCreature = player.field[row]?.[col === 0 ? 1 : 0];
  return !otherCreature || otherCreature.id === card.id;
}

/** An upgrade goes under a creature, in col 2 first and then col 3. */
export function canPlaceUpgrade(player: Player, row: number, col: number): boolean {
  if (col !== 2 && col !== 3) return false;
  const fieldRow = player.field[row];
  if (!fieldRow || fieldRow[col]) return false;
  if (col === 3 && !fieldRow[2]) return false;
  return !!(fieldRow[0] || fieldRow[1]);
}

/** True if any creature on the field still has room for an upgrade. */
export function hasUpgradeSlot(player: PlayerView): boolean {
  return player.field.some(row =>
    row[3] == null && (row[0]?.type === "creature" || row[1]?.type === "creature")
  );
}
