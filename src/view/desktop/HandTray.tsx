import type { GameControls } from "../../app/useGameController";
import { CardImage } from "../components/CardImage";

/** Your hand, in the chocolate tray at the bottom. Phase 1 lays the cards out in a plain row. */
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
          const classes = ["gpd-hand-card"];
          if (card.instanceId === selectedId) classes.push("is-selected");
          if (!queries.canPlayHandCard(viewer, card)) classes.push("is-unplayable");
          return (
            <CardImage
              key={card.instanceId}
              className={classes.join(" ")}
              controls={controls}
              card={card}
              owner={viewer}
              // Discards in the discard phase, otherwise selects or deselects the card
              onClick={() => controls.clickHandCard(card)}
            />
          );
        })}
      </div>
    </section>
  );
}
