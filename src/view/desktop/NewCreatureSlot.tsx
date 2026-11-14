import type { GameControls } from "../../app/useGameController";
import type { PlayerView } from "../../model/game/views";

/**
 * A dashed "New creature" spot at an end of your lane, where the selected creature can start a new row.
 * `row` is the placeholder row from `fieldRowsWithPlaceholders` (-1, field.length, or 0 on an empty field).
 * The lane only draws it while `canClickField(owner, row, 0)` is true.
 */
export function NewCreatureSlot({ controls, owner, row }: {
  controls: GameControls;
  owner: PlayerView;
  row: number;
}) {
  return (
    <div className="gpd-tile gpd-new-slot" data-side="viewer">
      <button type="button" className="gpd-new-slot-card" onClick={() => controls.clickField(owner, row, 0)}>
        New<br />creature
      </button>
    </div>
  );
}
