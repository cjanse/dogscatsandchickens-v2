import { useState, useEffect } from "react";
import { useGameController } from "./app/useGameController";
import { columnsInUse, fieldRowsWithPlaceholders, visualCells } from "./app/fieldRows";
import type { PlayerView } from "./model/game/views";
import { CardImage } from "./view/components/CardImage";
import { DeckPile } from "./view/components/DeckPile";
import { DiscardPile } from "./view/components/DiscardPile";
import { FieldCell } from "./view/components/FieldCell";
import { GameOverScreen } from "./view/components/GameOverScreen";
import { MessageBanner } from "./view/components/MessageBanner";
import { TurnControls } from "./view/components/TurnControls";

/** The desktop view: opponent on the left, deck and turn info in the middle, you on the right. */
export default function GamePageV1() {
  const controls = useGameController();
  const { queries, viewer, opponent } = controls;
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Side columns share the width left over by the center column (roughly 180px) and gaps
  const sideColumnWidth = (windowSize.width - 200) / 2;

  // Aim for ~5-6 hand cards per row
  const handCardWidth = Math.max(25, sideColumnWidth * 0.15);
  const handCardHeight = handCardWidth * 1.3;

  const pileCardWidth = Math.max(35, sideColumnWidth * 0.2);
  const pileCardHeight = pileCardWidth * 1.3;

  const baseFontSize = Math.max(7, windowSize.height * 0.015);
  const headerFontSize = baseFontSize * 1.3;
  const smallFontSize = baseFontSize * 0.85;
  const labelStyle = { margin: "1px 0", fontSize: `${smallFontSize}px` };

  function renderField(owner: PlayerView, isOpponent: boolean) {
    const fieldRows = fieldRowsWithPlaceholders(owner.field);
    const visualRows = isOpponent ? [...fieldRows].reverse() : fieldRows;

    // Every row is drawn as wide as the widest one, so all cells share one size
    const maxColsToShow = Math.max(...fieldRows.map(r => columnsInUse(r.cells)));
    const fieldIsEmpty = owner.field.length === 0;
    const cardWidth = fieldIsEmpty
      ? 40
      : Math.max(35, Math.min(110, (sideColumnWidth - (maxColsToShow - 1) * 2) / maxColsToShow));
    const cardHeight = cardWidth * 1.3;

    return (
      <div style={{ display: "flex", justifyContent: "center", overflowX: "auto", width: "100%" }}>
        {visualRows.map((rowEntry) => (
          <div key={rowEntry.modelRow} style={{ display: "flex", flexDirection: "column", marginRight: 1 }}>
            {visualCells(rowEntry.cells, isOpponent, maxColsToShow).map(({ cell, modelCol }) => (
              <FieldCell
                key={modelCol}
                className="field-card-container"
                controls={controls}
                owner={owner}
                row={rowEntry.modelRow}
                col={modelCol}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  borderWidth: 1,
                  marginBottom: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: cell ? "#fff" : "#f5f5f5",
                  boxSizing: "border-box",
                  padding: 0,
                  overflow: "visible",
                }}
              >
                {cell && (
                  <CardImage
                    className="field-card-image"
                    controls={controls}
                    card={cell}
                    owner={owner}
                    onField
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                  />
                )}
              </FieldCell>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (controls.result.state !== "ongoing") {
    return <GameOverScreen result={controls.result} />;
  }

  return (
    <div style={{ padding: 2, display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 4, height: "100vh", width: "100%", overflow: "hidden" }}>

      {/* LEFT COLUMN: Opponent */}
      <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 }}>
        <h4 style={{ margin: "1px 0", fontSize: `${headerFontSize}px` }}>{opponent.id}</h4>
        <p style={{ margin: 0, fontSize: `${smallFontSize}px` }}>Hand ({opponent.hand.length})</p>
        <div style={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", marginBottom: 3 }}>
          {opponent.hand.map((card) => (
            <CardImage
              key={card.instanceId}
              controls={controls}
              card={card}
              owner={opponent}
              onClick={() => controls.clickOpponentHandCard(card)}
              style={{
                width: handCardWidth,
                height: handCardHeight,
                objectFit: "contain",
                cursor: queries.canInteractWithOpponentCard(opponent) ? "pointer" : "not-allowed",
                border: "0.5px solid black",
                opacity: queries.isCardVisibleToPlayer(card, opponent) ? 1 : 0.6,
              }}
            />
          ))}
        </div>
        {renderField(opponent, true)}
      </div>

      {/* CENTER COLUMN: Deck, Discard, Turn Info, and Actions */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, justifyContent: "center", height: "100%", maxWidth: 180 }}>
        <DeckPile controls={controls} width={pileCardWidth} height={pileCardHeight} labelStyle={labelStyle} />

        <DiscardPile
          controls={controls}
          width={pileCardWidth}
          height={pileCardHeight}
          labelStyle={labelStyle}
          listStyle={{ width: 120 }}
          rowStyle={{ fontSize: "9px" }}
          nameStyle={{ fontSize: "8px" }}
        />

        <div style={{
          backgroundColor: "#e8e8e8",
          padding: 3,
          borderRadius: 2,
          border: "1px solid black",
          fontSize: `${smallFontSize}px`,
          textAlign: "center",
          minWidth: 100
        }}>
          <p style={{ margin: 0 }}>Moves: {queries.getMovesLeft()} / {queries.getMaxMoves()}</p>
          <p style={{ margin: 0 }}>Turn: {queries.getTurnType()}</p>
        </div>

        <TurnControls controls={controls} discardLabel="Discard Extra" buttonStyle={{ padding: "4px 8px", fontSize: "10px" }} />

        <MessageBanner message={controls.message} onDismiss={controls.dismissMessage} style={{ fontSize: `${smallFontSize}px` }} />
      </div>

      {/* RIGHT COLUMN: You (the viewer) */}
      <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" }}>
        <h4 style={{ margin: "1px 0", fontSize: `${headerFontSize}px` }}>{viewer.id}</h4>

        {/* Scrollable area: field + hand */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ marginBottom: 3 }}>
            {renderField(viewer, false)}
          </div>

          <p style={{ margin: 0, fontSize: `${smallFontSize}px` }}>Hand ({viewer.hand.length})</p>
          <div style={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", marginBottom: 3 }}>
            {viewer.hand.map((card) => {
              const selected = queries.getSelectedCard()?.instanceId === card.instanceId;
              const playable = queries.canPlayHandCard(viewer, card);
              return (
                <CardImage
                  key={card.instanceId}
                  className="hand-card-image"
                  controls={controls}
                  card={card}
                  owner={viewer}
                  // Discards in the discard phase, otherwise selects or deselects the card
                  onClick={() => controls.clickHandCard(card)}
                  style={{
                    width: handCardWidth,
                    height: handCardHeight,
                    objectFit: "contain",
                    cursor: playable ? "pointer" : "not-allowed",
                    border: selected ? "1.5px solid yellow" : "0.5px solid black",
                    opacity: playable ? 1 : 0.5,
                    transform: selected ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.2s"
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
