import type { CSSProperties, ReactNode } from "react";
import type { GameControls } from "../../app/useGameController";
import type { PlayerView } from "../../model/game/views";
import { abilityText } from "../../app/abilityText";

/**
 * One slot on a field. Clicking it does whatever the controller says a click there means (attack,
 * place the selected card, Power of Tea). While a card is selected, the slots it can go to are
 * outlined green and the rest red. Size and spacing come from `style`; the border width should too.
 *
 * On the viewer's turn, the top card of a face-down matched pair (col 1) carries an Activate button.
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
  const canActivate = col === 1 && controls.queries.canClickActivate(owner, row);

  return (
    <div
      className={className}
      onClick={() => {
        if (canClick) controls.clickField(owner, row, col);
      }}
      style={{
        ...style,
        position: "relative",
        borderStyle: "solid",
        borderColor: somethingSelected ? (canClick ? "green" : "red") : "black",
        cursor: canClick ? "pointer" : "default",
      }}
    >
      {children}
      {canActivate && (
        // Small cells only have room for the icon; the tooltip still names the ability
        <ActivateButton controls={controls} owner={owner} row={row} iconOnly={typeof style?.width === "number" && style.width < 64} />
      )}
    </div>
  );
}

/** Flips the pair face up and turns its ability on. Costs no move. */
function ActivateButton({ controls, owner, row, iconOnly }: {
  controls: GameControls;
  owner: PlayerView;
  row: number;
  iconOnly: boolean;
}) {
  const abilityType = controls.queries.getPairAbility(owner, row);
  const ability = abilityType ? abilityText(abilityType) : null;
  // The wording about the button itself is view copy; the ability's name and description come from abilities.json
  const tooltip = ability
    ? `Activate ${ability.name} (free, no move): ${ability.description} The pair flips face up.`
    : "Activate this pair's ability (free, no move). The pair flips face up.";

  return (
    <button
      type="button"
      className="activate-pair-button"
      title={tooltip}
      aria-label={tooltip}
      onClick={e => {
        // The cell's own click would start an attack
        e.stopPropagation();
        controls.activatePair(owner, row);
      }}
    >
      {iconOnly ? "⚡" : "⚡ Activate"}
    </button>
  );
}
