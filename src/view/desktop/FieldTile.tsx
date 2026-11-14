import type { GameControls } from "../../app/useGameController";
import type { CardView, PlayerView } from "../../model/game/views";
import { ActivatePill } from "./ActivatePill";
import { DesktopFieldZone } from "./DesktopFieldZone";
import { popoverContent, useHoverPopover, type PopoverItem } from "./hoverPopover";

/**
 * The stack fanned out for the hover popover, left to right: the creature, its twin, the inner upgrade
 * (col 2) and the outer one (col 3, the top of the stack, which triggers first). Labels come from the
 * column only. Col 3 is only ever filled on top of col 2, so a stack with one upgrade reads "Upgrade".
 */
function stackItems(owner: PlayerView, cells: readonly (CardView | null)[], frontCol: number): PopoverItem[] {
  const items: PopoverItem[] = [];
  const add = (card: CardView | null | undefined, item: Omit<PopoverItem, "card" | "owner">) => {
    if (card) items.push({ card, owner, ...item });
  };
  add(cells[frontCol], { label: "Creature" });
  add(cells[1 - frontCol], { label: "Twin" });
  add(cells[2], { label: "Upgrade" });
  add(cells[3], cells[2] ? { label: "Upgrade", note: "triggers first", accent: true } : { label: "Upgrade" });
  return items;
}

/**
 * One creature slot (one model row) as a stacked tile: the creature in front, its twin peeking out behind
 * it, and the upgrades tucked under it as slivers, the outer one (col 3, which triggers first) furthest
 * out. The opponent's tile is mirrored vertically in CSS through `data-side`.
 *
 * Hovering the tile (any part of it) opens the stack popover beside it, unless the viewer can see none
 * of its cards.
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
  const popover = popoverContent(controls.queries, "side", stackItems(owner, cells, frontCol));
  const hoverHandlers = useHoverPopover(popover);

  return (
    <div className="gpd-tile" data-side={isOpponent ? "opponent" : "viewer"} data-peek={popover !== null} {...hoverHandlers}>
      <DesktopFieldZone controls={controls} owner={owner} row={row} col={frontCol} card={cells[frontCol] ?? null} slot="front" />
      <DesktopFieldZone controls={controls} owner={owner} row={row} col={twinCol} card={cells[twinCol] ?? null} slot="twin" />
      <DesktopFieldZone controls={controls} owner={owner} row={row} col={2} card={cells[2] ?? null} slot="inner" />
      <DesktopFieldZone controls={controls} owner={owner} row={row} col={3} card={cells[3] ?? null} slot="outer" />
      {/* A tile-level sibling, so it stays above a placement overlay (a zone can't lift it out of its own stacking context) */}
      {controls.queries.canClickActivate(owner, row) && <ActivatePill controls={controls} owner={owner} row={row} />}
    </div>
  );
}
