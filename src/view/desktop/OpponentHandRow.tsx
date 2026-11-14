import type { GameControls } from "../../app/useGameController";
import { CardImage } from "../components/CardImage";
import { popoverContent } from "./hoverPopover";
import { PopoverAnchor } from "./PopoverAnchor";

/**
 * The opponent's hand as a row of small cards along the top.
 * - Bird Army pending (the backs are clickable): every back glows, the hovered one lifts, and a prompt says
 *   what the pick does.
 * - Messy Dorm: CardImage shows the faces at the same small size, and hovering one opens its popover
 *   below it. Hidden backs never open one.
 * Each card sits in a slot a little bigger than the card (the hit target), with the same lift and hit
 * extender as the hand.
 */
export function OpponentHandRow({ controls }: { controls: GameControls }) {
  const { queries, opponent } = controls;
  const count = opponent.hand.length;
  const isPicking = queries.canInteractWithOpponentCard(opponent);
  const isRevealed = queries.isHandRevealed(opponent);

  let subline = `${count} ${count === 1 ? "card" : "cards"} in hand`;
  if (isPicking) subline = "Pick a back to steal a random card of that type.";
  else if (isRevealed) subline = "Shown until your next move.";

  return (
    <div className="gpd-opp-hand" data-clickable={isPicking} data-revealed={isRevealed}>
      <div className="gpd-hand-info">
        <span className="gpd-hand-title">Opponent</span>
        <span className={isPicking || isRevealed ? "gpd-hand-count gpd-opp-prompt" : "gpd-hand-count"}>{subline}</span>
      </div>
      <div className="gpd-opp-hand-cards">
        {opponent.hand.map(card => (
          <PopoverAnchor
            key={card.instanceId}
            className="gpd-opp-slot"
            content={popoverContent(queries, "below", [{ card, owner: opponent, label: card.name }])}
            onClick={() => controls.clickOpponentHandCard(card)}
          >
            <CardImage className="gpd-opp-card" controls={controls} card={card} owner={opponent} />
          </PopoverAnchor>
        ))}
      </div>
    </div>
  );
}
