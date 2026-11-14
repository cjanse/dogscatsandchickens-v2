import type { CSSProperties } from "react";
import type { GameControls } from "../../app/useGameController";
import type { TurnType } from "../../model/types/TurnType";
import { DeckPile } from "../components/DeckPile";
import { DiscardPile } from "../components/DiscardPile";
import { MessageBanner } from "../components/MessageBanner";
import { EndTurnButton } from "./EndTurnButton";

const TURN_TYPE_LABEL: Record<TurnType, string> = {
  reinforce: "Reinforce",
  attack: "Attack",
};

// The shared piles take their box size as numbers. These are the base size; desktop.css scales them with the rail.
const PILE_WIDTH = 76;
const PILE_HEIGHT = 114;

// The shared components can only be styled through these props. Colours come from the CSS variables.
const DISCARD_LIST_STYLE: CSSProperties = {
  top: 0,
  left: "auto",
  right: "calc(100% + 12px)",
  transform: "none",
  width: "calc(220 * var(--rpx))",
  maxHeight: "calc(320 * var(--rpx))",
  padding: 8,
  gap: 6,
  backgroundColor: "var(--c-panel)",
  border: "1px solid rgb(246 239 227 / 0.14)",
  borderRadius: 10,
  boxShadow: "0 18px 40px rgb(0 0 0 / 0.6)",
};
const DISCARD_ROW_STYLE: CSSProperties = {
  backgroundColor: "var(--c-table)",
  border: "1px solid rgb(246 239 227 / 0.1)",
  borderRadius: 6,
  color: "var(--c-text)",
  textAlign: "left",
};
const DISCARD_THUMB_STYLE: CSSProperties = {
  width: 28,
  height: 42,
  objectFit: "cover",
  border: "1px solid var(--c-rim)",
  borderRadius: 3,
};
const DISCARD_NAME_STYLE: CSSProperties = { fontSize: "calc(12 * var(--rpx))", fontWeight: 700 };
const BANNER_STYLE: CSSProperties = {
  alignItems: "flex-start",
  gap: 8,
  padding: "calc(10 * var(--rpx))",
  backgroundColor: "rgb(229 72 77 / 0.13)",
  color: "var(--c-text)",
  border: "1px solid rgb(229 72 77 / 0.55)",
  borderRadius: 10,
  fontSize: "calc(12 * var(--rpx))",
  fontWeight: 700,
  lineHeight: 1.35,
};

/** The fixed rail on the right: turn panel, piles, message area and the End Turn button. */
export function SideRail({ controls }: { controls: GameControls }) {
  const { queries, isMyTurn } = controls;
  const turnType = queries.getTurnType();
  const movesLeft = queries.getMovesLeft();
  const maxMoves = queries.getMaxMoves();

  return (
    <aside className="gpd-rail">
      <section className="gpd-turn-panel">
        <div className="gpd-turn-head">
          <img className="gpd-avatar" src="/assets/bella-avatar.jpg" alt="" />
          <div className="gpd-turn-text">
            <span className="gpd-turn-title" data-whose={isMyTurn ? "you" : "opponent"}>
              {isMyTurn ? "Your turn" : "Opponent's turn"}
            </span>
            <span className="gpd-turn-type" data-turn-type={turnType}>{TURN_TYPE_LABEL[turnType]}</span>
          </div>
        </div>
        {/* An attack uses the whole turn, so the attack turn shows no moves row */}
        {turnType !== "attack" && (
          <div className="gpd-moves">
            <span className="gpd-moves-label">Moves left</span>
            <div className="gpd-moves-value" aria-label={`${movesLeft} of ${maxMoves} moves left`}>
              {Array.from({ length: maxMoves }, (_, i) => (
                <span key={i} className={i < movesLeft ? "gpd-pip is-left" : "gpd-pip"} aria-hidden="true" />
              ))}
              <span className="gpd-moves-count" aria-hidden="true">{movesLeft} / {maxMoves}</span>
            </div>
          </div>
        )}
      </section>

      <section className="gpd-piles">
        <div className="gpd-pile">
          <DeckPile controls={controls} width={PILE_WIDTH} height={PILE_HEIGHT} />
        </div>
        <div className="gpd-pile">
          <DiscardPile
            controls={controls}
            width={PILE_WIDTH}
            height={PILE_HEIGHT}
            listStyle={DISCARD_LIST_STYLE}
            rowStyle={DISCARD_ROW_STYLE}
            thumbStyle={DISCARD_THUMB_STYLE}
            nameStyle={DISCARD_NAME_STYLE}
          />
        </div>
      </section>

      <div className="gpd-message-area">
        <MessageBanner message={controls.message} onDismiss={controls.dismissMessage} style={BANNER_STYLE} />
      </div>

      <EndTurnButton controls={controls} />
    </aside>
  );
}
