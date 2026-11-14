import type { GameControls } from "../../app/useGameController";
import { CardImage } from "../components/CardImage";

/** The opponent's hand as a row of small cards along the top. Clickable while an action card targets it. */
export function OpponentHandRow({ controls }: { controls: GameControls }) {
  const { queries, opponent } = controls;
  const count = opponent.hand.length;

  return (
    <div className="gpd-opp-hand" data-clickable={queries.canInteractWithOpponentCard(opponent)}>
      <div className="gpd-hand-info">
        <span className="gpd-hand-title">Opponent</span>
        <span className="gpd-hand-count">{count} {count === 1 ? "card" : "cards"} in hand</span>
      </div>
      <div className="gpd-opp-hand-cards">
        {opponent.hand.map(card => (
          <CardImage
            key={card.instanceId}
            className="gpd-opp-card"
            controls={controls}
            card={card}
            owner={opponent}
            onClick={() => controls.clickOpponentHandCard(card)}
          />
        ))}
      </div>
    </div>
  );
}
