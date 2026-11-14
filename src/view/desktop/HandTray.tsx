import type { CSSProperties } from "react";
import type { GameControls } from "../../app/useGameController";
import { CardImage } from "../components/CardImage";
import { popoverContent } from "./hoverPopover";
import { PopoverAnchor } from "./PopoverAnchor";

/**
 * Your hand, in the chocolate tray at the bottom: one strip that overlaps only when it runs out of room
 * (desktop.css sizes the step from `--n`), then scrolls sideways.
 *
 * Each card sits in a slot that opens its hover popover above it. The slot carries the card's lift (hover
 * or selected), so the popover is placed against where the card is drawn, and a hit extender under it
 * keeps the band it left hoverable (no flicker at the bottom edge). Every card opens its popover, dimmed
 * or not. The tray's data attributes carry the attack-turn dim and the discard phase.
 */
export function HandTray({ controls }: { controls: GameControls }) {
  const { queries, viewer } = controls;
  const selectedId = queries.getSelectedCard()?.instanceId;
  const count = viewer.hand.length;

  return (
    <section
      className="gpd-tray"
      data-turn-type={queries.getTurnType()}
      data-discarding={queries.isDiscardPhase()}
      style={{ "--n": count } as CSSProperties}
    >
      <div className="gpd-hand-info">
        <span className="gpd-hand-title">Your hand</span>
        <span className="gpd-hand-count">{count} {count === 1 ? "card" : "cards"}</span>
      </div>
      <div className="gpd-tray-cards">
        {viewer.hand.map(card => {
          const isSelected = card.instanceId === selectedId;
          const isUnplayable = !queries.canPlayHandCard(viewer, card);
          const cardClasses = ["gpd-hand-card"];
          const slotClasses = ["gpd-hand-slot"];
          if (isSelected) {
            cardClasses.push("is-selected");
            slotClasses.push("is-selected");
          }
          if (isUnplayable) {
            cardClasses.push("is-unplayable");
            slotClasses.push("is-unplayable");
          }
          return (
            <PopoverAnchor
              key={card.instanceId}
              className={slotClasses.join(" ")}
              content={popoverContent(queries, "above", [{ card, owner: viewer, label: card.name }])}
              // Discards in the discard phase, otherwise selects or deselects the card
              onClick={() => controls.clickHandCard(card)}
            >
              <CardImage className={cardClasses.join(" ")} controls={controls} card={card} owner={viewer} />
            </PopoverAnchor>
          );
        })}
      </div>
    </section>
  );
}
