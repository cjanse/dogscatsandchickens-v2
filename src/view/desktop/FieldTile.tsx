import type { GameControls } from "../../app/useGameController";
import type { CardView, PlayerView } from "../../model/game/views";
import { ActivatePill } from "./ActivatePill";
import { DesktopFieldZone } from "./DesktopFieldZone";

/**
 * One creature slot (one model row) as a stacked tile: the creature in front, its twin peeking out behind
 * it, and the upgrades tucked under it as slivers, the outer one (col 3, which triggers first) furthest
 * out. The opponent's tile is mirrored vertically in CSS through `data-side`.
 *
 * The tile is a single wrapper element, so a later hover popover can measure it.
 */
export function FieldTile({ controls, owner, row, cells, isOpponent }: {
  controls: GameControls;
  owner: PlayerView;
  /** Model row index. */
  row: number;
  cells: readonly (CardView | null)[];
  isOpponent: boolean;
}) {
  // The creature that is down shows in front. The AI sometimes opens a row in col 1, so it isn't always col 0.
  const frontCol = cells[0] === null && cells[1] !== null ? 1 : 0;
  const twinCol = 1 - frontCol;

  return (
    <div className="gpd-tile" data-side={isOpponent ? "opponent" : "viewer"}>
      <DesktopFieldZone controls={controls} owner={owner} row={row} col={frontCol} card={cells[frontCol] ?? null} slot="front" />
      <DesktopFieldZone controls={controls} owner={owner} row={row} col={twinCol} card={cells[twinCol] ?? null} slot="twin" />
      <DesktopFieldZone controls={controls} owner={owner} row={row} col={2} card={cells[2] ?? null} slot="inner" />
      <DesktopFieldZone controls={controls} owner={owner} row={row} col={3} card={cells[3] ?? null} slot="outer" />
      {/* A tile-level sibling, so it stays above a placement overlay (a zone can't lift it out of its own stacking context) */}
      {controls.queries.canClickActivate(owner, row) && <ActivatePill controls={controls} owner={owner} row={row} />}
    </div>
  );
}
