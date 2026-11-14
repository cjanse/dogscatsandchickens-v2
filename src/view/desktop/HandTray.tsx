import type { GameControls } from "../../app/useGameController";
import { CardImage } from "../components/CardImage";
import { popoverContent } from "./hoverPopover";
import { PopoverAnchor } from "./PopoverAnchor";

/**
 * Your hand, in the chocolate tray at the bottom. Phase 1 lays the cards out in a plain row. Each card sits
 * in a wrapper that opens its hover popover above it; the wrapper also carries the selected card's lift,
 * so the popover is placed against where the card is drawn.
 */
export function HandTray({ controls }: { controls: GameControls }) {
  const { queries, viewer } = controls;
  const selectedId = queries.getSelectedCard()?.instanceId;
  const count = viewer.hand.length;

  return (
    <section className="gpd-tray">
      <div className="gpd-hand-info">
        <span className="gpd-hand-title">Your hand</span>
        <span className="gpd-hand-count">{count} {count === 1 ? "card" : "cards"}</span>
      </div>
      <div className="gpd-tray-cards">
        {viewer.hand.map(card => {
          const isSelected = card.instanceId === selectedId;
          const classes = ["gpd-hand-card"];
          if (isSelected) classes.push("is-selected");
          if (!queries.canPlayHandCard(viewer, card)) classes.push("is-unplayable");
          return (
            <PopoverAnchor
              key={card.instanceId}
              className={isSelected ? "gpd-hand-slot is-selected" : "gpd-hand-slot"}
              content={popoverContent(queries, "above", [{ card, owner: viewer, label: card.name }])}
            >
              <CardImage
                className={classes.join(" ")}
                controls={controls}
                card={card}
                owner={viewer}
                // Discards in the discard phase, otherwise selects or deselects the card
                onClick={() => controls.clickHandCard(card)}
              />
            </PopoverAnchor>
          );
        })}
      </div>
    </section>
  );
}
