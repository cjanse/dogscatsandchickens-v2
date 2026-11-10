import type { CSSProperties } from "react";
import type { GameControls } from "../../app/useGameController";
import { cardBackUrl } from "../../app/cardImages";

/** The draw pile with its card count. Outlined green, one pixel thicker, while the player can draw. */
export function DeckPile({ controls, width, height, borderWidth = 1, labelStyle }: {
  controls: GameControls;
  width: number;
  height: number;
  borderWidth?: number;
  labelStyle?: CSSProperties;
}) {
  const { game, queries, currentPlayer } = controls;
  const canDraw = queries.canDrawCard(currentPlayer);

  return (
    <div style={{ textAlign: "center" }}>
      <p style={labelStyle}>Deck ({game.deck.size})</p>
      <div
        onClick={() => {
          if (canDraw) controls.drawCard();
        }}
        style={{
          width,
          height,
          border: canDraw ? `${borderWidth + 1}px solid green` : `${borderWidth}px solid black`,
          backgroundColor: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: canDraw ? "pointer" : "not-allowed",
          overflow: "hidden",
          fontSize: "8px",
        }}
      >
        {game.deck.size > 0 ? (
          <img src={cardBackUrl(game.deck.peek())} alt="Deck" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span>Empty</span>
        )}
      </div>
    </div>
  );
}
