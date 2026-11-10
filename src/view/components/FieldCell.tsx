import type { CSSProperties, ReactNode } from "react";
import type { GameControls } from "../../app/useGameController";
import type { PlayerView } from "../../model/game/views";

/**
 * One slot on a field. Clicking it does whatever the controller says a click there means (attack,
 * place the selected card, Power of Tea). While a card is selected, the slots it can go to are
 * outlined green and the rest red. Size and spacing come from `style`; the border width should too.
 */
export function FieldCell({ controls, owner, row, col, className, style, children }: {
  controls: GameControls;
  owner: PlayerView;
  /** Model row index, from `fieldRowsWithPlaceholders`. */
  row: number;
  /** Model column index, from `visualCells`. */
  col: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const canClick = controls.queries.canClickField(owner, row, col);
  const somethingSelected = controls.queries.getSelectedCard() !== null;

  return (
    <div
      className={className}
      onClick={() => {
        if (canClick) controls.clickField(owner, row, col);
      }}
      style={{
        ...style,
        borderStyle: "solid",
        borderColor: somethingSelected ? (canClick ? "green" : "red") : "black",
        cursor: canClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}
