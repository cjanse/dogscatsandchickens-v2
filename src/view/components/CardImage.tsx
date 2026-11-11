import type { CSSProperties } from "react";
import type { GameControls } from "../../app/useGameController";
import type { CardView, PlayerView } from "../../model/game/views";
import { cardBackUrl, cardFrontUrl } from "../../app/cardImages";

/**
 * A card's front if the current player may see it, otherwise its back. On the field, your own
 * face-down cards show their front at half opacity, so you can tell what the opponent can't see.
 * `style.opacity` overrides that.
 */
export function CardImage({ controls, card, owner, onField = false, className, style, onClick }: {
  controls: GameControls;
  card: CardView;
  /** The player whose hand or field holds the card. */
  owner: PlayerView;
  onField?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const { queries, viewer } = controls;
  const visible = queries.isCardVisibleToPlayer(card, owner);
  const ownFaceDown = onField && owner.id === viewer.id && !queries.isFaceUp(card);

  return (
    <img
      className={className}
      src={visible ? cardFrontUrl(card) : cardBackUrl(card)}
      alt={visible ? card.name : `Face-down ${card.type}`}
      onClick={onClick}
      style={{ opacity: ownFaceDown ? 0.5 : 1, ...style }}
    />
  );
}
