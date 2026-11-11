import type { CardView } from "../model/game/views";
import type { FieldView } from "../model/game/views";

export interface FieldRowView {
  /** The row index to give the controller. -1 and field.length are the new rows above and below the field. */
  modelRow: number;
  cells: readonly (CardView | null)[];
  isPlaceholder: boolean;
}

const FIELD_COLS = 4;

/**
 * The model's field only holds rows that have cards in them. The UI also shows an empty row above
 * and below, as somewhere to play a new creature. An empty field shows just one.
 */
export function fieldRowsWithPlaceholders(field: FieldView): FieldRowView[] {
  const placeholder = (modelRow: number): FieldRowView => ({
    modelRow,
    cells: Array<CardView | null>(FIELD_COLS).fill(null),
    isPlaceholder: true,
  });

  if (field.length === 0) return [placeholder(0)];

  return [
    placeholder(-1),
    ...field.map((cells, modelRow) => ({ modelRow, cells, isPlaceholder: false })),
    placeholder(field.length),
  ];
}

/**
 * How many columns a row needs on screen: 1 for an empty row (somewhere to drop a creature),
 * 3 for a creature with no upgrade (creature, twin slot, first upgrade slot), 4 once it has an upgrade.
 */
export function columnsInUse(cells: readonly (CardView | null)[]): number {
  if (!cells.some(card => card?.type === "creature")) return 1;
  return cells.some(card => card?.type === "upgrade") ? 4 : 3;
}

export interface VisualCell {
  cell: CardView | null;
  /** The column index to give the controller. */
  modelCol: number;
}

/**
 * The first `colsToShow` cells of a row in screen order, each with its model column. The opponent's
 * field is drawn mirrored, so their cells come out in reverse.
 */
export function visualCells(cells: readonly (CardView | null)[], isOpponent: boolean, colsToShow = FIELD_COLS): VisualCell[] {
  const shown = cells.slice(0, colsToShow).map((cell, modelCol) => ({ cell, modelCol }));
  return isOpponent ? shown.reverse() : shown;
}
