import type { CSSProperties } from "react";
import type { GameControls } from "../../app/useGameController";
import { fieldRowsWithPlaceholders } from "../../app/fieldRows";
import type { PlayerView } from "../../model/game/views";
import { FieldTile } from "./FieldTile";
import { NewCreatureSlot } from "./NewCreatureSlot";

/**
 * One player's field: a tile per creature slot, in model row order (reversed for the opponent, whose lane
 * is drawn mirrored). The empty rows above and below the field only show, as "New creature" spots, while
 * the selected card can go there. Tile sizes come from CSS: the lane's height first, then shrinking to
 * 80% when there are many tiles (`--n`), after which the lane scrolls sideways.
 */
export function FieldLane({ controls, owner, isOpponent }: {
  controls: GameControls;
  owner: PlayerView;
  isOpponent: boolean;
}) {
  const fieldRows = fieldRowsWithPlaceholders(owner.field);
  const visualRows = isOpponent ? [...fieldRows].reverse() : fieldRows;
  const shownRows = visualRows.filter(r => !r.isPlaceholder || controls.queries.canClickField(owner, r.modelRow, 0));
  const creatures = owner.field.length;

  return (
    <section
      className="gpd-lane"
      data-side={isOpponent ? "opponent" : "viewer"}
      style={{ "--n": shownRows.length } as CSSProperties}
    >
      <span className="gpd-lane-label">{isOpponent ? "Opponent's field" : "Your field"}</span>
      {/* Only visible while the lane is crowded (CSS) */}
      <span className="gpd-lane-count">{creatures} {creatures === 1 ? "creature" : "creatures"}</span>
      <div className="gpd-lane-scroll">
        {shownRows.map(rowEntry =>
          rowEntry.isPlaceholder
            ? <NewCreatureSlot key={rowEntry.modelRow} controls={controls} owner={owner} row={rowEntry.modelRow} />
            : <FieldTile
                key={rowEntry.modelRow}
                controls={controls}
                owner={owner}
                row={rowEntry.modelRow}
                cells={rowEntry.cells}
                isOpponent={isOpponent}
              />
        )}
      </div>
    </section>
  );
}
