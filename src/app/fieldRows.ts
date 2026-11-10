import type { Card } from "../model/cards/Card";
import type { FieldView } from "../model/game/views";

export interface FieldRowView {
  /** The row index to give the controller. -1 and field.length are the new rows above and below the field. */
  modelRow: number;
  cells: readonly (Card | null)[];
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
    cells: Array<Card | null>(FIELD_COLS).fill(null),
    isPlaceholder: true,
  });

  if (field.length === 0) return [placeholder(0)];

  return [
    placeholder(-1),
    ...field.map((cells, modelRow) => ({ modelRow, cells, isPlaceholder: false })),
    placeholder(field.length),
  ];
}
