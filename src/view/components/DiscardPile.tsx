import { useState, type CSSProperties } from "react";
import type { GameControls } from "../../app/useGameController";
import { cardFrontUrl } from "../../app/cardImages";

/**
 * The discard pile showing its top card. Clicking it opens a list of every discarded card, newest
 * first; a card a Spirit can revive is clickable there. The list closes after a successful pick.
 * `listStyle`, `rowStyle`, `thumbStyle` and `nameStyle` are merged over the defaults.
 */
export function DiscardPile({ controls, width, height, borderWidth = 1, labelStyle, listStyle, rowStyle, thumbStyle, nameStyle }: {
  controls: GameControls;
  width: number;
  height: number;
  borderWidth?: number;
  labelStyle?: CSSProperties;
  listStyle?: CSSProperties;
  rowStyle?: CSSProperties;
  thumbStyle?: CSSProperties;
  nameStyle?: CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  const { game, queries } = controls;
  const pile = game.discardPile;

  return (
    <div style={{ textAlign: "center", position: "relative" }}>
      <p style={labelStyle}>Discard ({pile.length})</p>
      <div
        onClick={() => {
          if (pile.length > 0) setExpanded(!expanded);
        }}
        style={{
          width,
          height,
          border: `${borderWidth}px solid black`,
          backgroundColor: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: pile.length > 0 ? "pointer" : "default",
          fontSize: "8px",
        }}
      >
        {pile.length > 0 ? (
          <img src={cardFrontUrl(pile[pile.length - 1])} alt="Discard" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span>Empty</span>
        )}
      </div>

      {expanded && pile.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: height + 20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: 6,
            backgroundColor: "#f9f9f9",
            border: `${borderWidth}px solid black`,
            borderRadius: 2,
            maxHeight: 250,
            overflowY: "auto",
            zIndex: 10,
            ...listStyle,
          }}
        >
          {[...pile].reverse().map((card) => {
            const canPick = queries.canInteractWithDiscardPileCard(card);
            return (
              <div
                key={card.instanceId}
                onClick={() => {
                  if (controls.clickDiscardPileCard(card)) setExpanded(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 4,
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: 2,
                  cursor: canPick ? "pointer" : "not-allowed",
                  opacity: canPick ? 1 : 0.5,
                  ...rowStyle,
                }}
              >
                <img
                  src={cardFrontUrl(card)}
                  alt={card.name}
                  style={{ width: 25, height: 30, objectFit: "contain", border: "1px solid black", ...thumbStyle }}
                />
                <span style={nameStyle}>{card.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
