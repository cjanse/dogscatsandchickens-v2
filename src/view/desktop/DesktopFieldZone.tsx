import type { GameControls } from "../../app/useGameController";
import type { FieldClickKind } from "../../controller/GameController";
import type { CardView, PlayerView } from "../../model/game/views";
import { CardImage } from "../components/CardImage";

/** Where a zone sits in its tile: the creature in front, the twin peeking out, and the two upgrade slivers. */
export type ZoneSlot = "front" | "twin" | "inner" | "outer";

/**
 * How a zone is drawn (the CSS reads `data-state`):
 * - `empty`: no card and nothing to do, so it is hidden.
 * - `selected`: the attacker while an attack is pending.
 * - `valid`: orange, a placement or Power of Tea target. An empty valid zone is drawn over the whole tile.
 * - `attack`: red, an attack target.
 * - `neutral`: a card with no highlight. It can still be clickable (starting an attack).
 */
type ZoneState = "empty" | "selected" | "valid" | "attack" | "neutral";

function zoneState(card: CardView | null, kind: FieldClickKind | null, selectedId: string | undefined): ZoneState {
  if (card === null) return kind === null ? "empty" : "valid";
  if (card.instanceId === selectedId) return "selected";
  if (kind === "attackTarget") return "attack";
  if (kind === "teaTarget" || kind === "place") return "valid";
  return "neutral";
}

/**
 * One cell of a field row inside a desktop tile. Clicking it does what the controller says a click there
 * means (the same path as the shared FieldCell). It is a div, not a button: the Activate pill is a button
 * and sits in the same tile.
 */
export function DesktopFieldZone({ controls, owner, row, col, card, slot }: {
  controls: GameControls;
  owner: PlayerView;
  /** Model row index. */
  row: number;
  /** Model column index. */
  col: number;
  card: CardView | null;
  slot: ZoneSlot;
}) {
  const { queries } = controls;
  const canClick = queries.canClickField(owner, row, col);
  const state = zoneState(card, queries.getFieldClickKind(owner, row, col), queries.getSelectedCard()?.instanceId);

  return (
    <div
      className={`gpd-zone gpd-zone-${slot}`}
      data-state={state}
      data-filled={card !== null}
      data-clickable={canClick}
      data-facedown={card !== null && !queries.isFaceUp(card)}
      onClick={() => {
        if (canClick) controls.clickField(owner, row, col);
      }}
    >
      {card
        ? <CardImage className="gpd-zone-img" controls={controls} card={card} owner={owner} onField />
        : <span className="gpd-zone-ghost" aria-hidden="true" />}
    </div>
  );
}
