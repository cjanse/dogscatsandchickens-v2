import type { CSSProperties } from "react";
import type { GameControls } from "../../app/useGameController";
import { columnsInUse, fieldRowsWithPlaceholders, visualCells } from "../../app/fieldRows";
import type { PlayerView } from "../../model/game/views";
import { CardImage } from "../components/CardImage";
import { FieldCell } from "../components/FieldCell";

/**
 * One player's field. Phase 1 keeps the old layout: each model row is a column of cells, and every
 * row is as tall as the widest one, so all cells share one size (set in CSS from --cols). The
 * opponent's lane is drawn mirrored. A crowded lane scrolls sideways.
 */
export function FieldLane({ controls, owner, isOpponent }: {
  controls: GameControls;
  owner: PlayerView;
  isOpponent: boolean;
}) {
  const fieldRows = fieldRowsWithPlaceholders(owner.field);
  const visualRows = isOpponent ? [...fieldRows].reverse() : fieldRows;
  const cols = Math.max(...fieldRows.map(r => columnsInUse(r.cells)));

  return (
    <section className="gpd-lane" data-side={isOpponent ? "opponent" : "viewer"}>
      <span className="gpd-lane-label">{isOpponent ? "Opponent's field" : "Your field"}</span>
      <div className="gpd-lane-scroll" style={{ "--cols": cols } as CSSProperties}>
        {visualRows.map(rowEntry => (
          <div key={rowEntry.modelRow} className="gpd-row">
            {visualCells(rowEntry.cells, isOpponent, cols).map(({ cell, modelCol }) => (
              <FieldCell
                key={modelCol}
                className="gpd-cell"
                controls={controls}
                owner={owner}
                row={rowEntry.modelRow}
                col={modelCol}
              >
                {cell && <CardImage className="gpd-cell-img" controls={controls} card={cell} owner={owner} onField />}
              </FieldCell>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
