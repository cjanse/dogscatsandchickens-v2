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

/** The phone view: one vertical column with fixed card sizes. */
export default function GamePageV1Mobile() {
  const controls = useGameController();
  const { queries, viewer, opponent } = controls;
  const labelStyle = { margin: "0 0 2px 0", fontSize: "11px" };

  function renderField(owner: PlayerView, isOpponent: boolean) {
    const fieldRows = fieldRowsWithPlaceholders(owner.field);
    const visualRows = isOpponent ? [...fieldRows].reverse() : fieldRows;

    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        {visualRows.map((rowEntry) => (
          <div key={rowEntry.modelRow} style={{ display: "flex", flexDirection: "column", marginRight: 6 }}>
            {/* Each row is only as tall as it needs to be */}
            {visualCells(rowEntry.cells, isOpponent, columnsInUse(rowEntry.cells)).map(({ cell, modelCol }) => (
              <FieldCell
                key={modelCol}
                controls={controls}
                owner={owner}
                row={rowEntry.modelRow}
                col={modelCol}
                style={{
                  width: 80,
                  height: 100,
                  borderWidth: 2,
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f5f5f5",
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                {cell && (
                  <CardImage
                    controls={controls}
                    card={cell}
                    owner={owner}
                    onField
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
    <div style={{ padding: 8, display: "flex", flexDirection: "column", alignItems: "center", height: "100vh", overflow: "auto" }}>
      <h3 style={{ margin: "2px 0", fontSize: "16px" }}>Dogs, Cats, and Chickens (v1) - Mobile</h3>

      {/* Opponent */}
      <div style={{ marginBottom: 12, textAlign: "center" }}>
        <h4 style={{ margin: "2px 0", fontSize: "14px" }}>{opponent.id}</h4>

        <p style={{ margin: "2px 0", fontSize: "11px" }}>Hand ({opponent.hand.length})</p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 6 }}>
          {opponent.hand.map((card) => (
            <CardImage
              key={card.instanceId}
              controls={controls}
              card={card}
              owner={opponent}
              onClick={() => controls.clickOpponentHandCard(card)}
              style={{
                width: 50,
                height: 65,
                objectFit: "cover",
                cursor: queries.canInteractWithOpponentCard(opponent) ? "pointer" : "not-allowed",
                border: "1px solid black",
                opacity: queries.isCardVisibleToPlayer(card, opponent) ? 1 : 0.6,
              }}
            />
          ))}
        </div>
        {renderField(opponent, true)}
      </div>

      {/* Deck and Discard Pile */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center", margin: "10px 0", alignItems: "flex-start" }}>
        <DeckPile controls={controls} width={80} height={100} borderWidth={2} labelStyle={labelStyle} />
        <DiscardPile
          controls={controls}
          width={80}
          height={100}
          borderWidth={2}
          labelStyle={labelStyle}
          listStyle={{ gap: 8, padding: 12, borderRadius: 4, maxHeight: 400 }}
          rowStyle={{ gap: 12, padding: 8, borderRadius: 4 }}
          thumbStyle={{ width: 50, height: 60, objectFit: "cover" }}
        />
      </div>

      {/* You */}
      <div style={{ textAlign: "center" }}>
        <h4 style={{ margin: "2px 0", fontSize: "14px" }}>
          {viewer.id} | {controls.isMyTurn
            ? <>Moves: {queries.getMovesLeft()} / {queries.getMaxMoves()} | Turn: {queries.getTurnType()}</>
            : "AI's turn"}
        </h4>

        <div style={{ marginBottom: 8 }}>
          {renderField(viewer, false)}
        </div>

        <p style={{ margin: "4px 0", fontSize: "11px" }}>Hand ({viewer.hand.length})</p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
          {viewer.hand.map((card) => {
            const selected = queries.getSelectedCard()?.instanceId === card.instanceId;
            const playable = queries.canPlayHandCard(viewer, card);
            return (
              <CardImage
                key={card.instanceId}
                controls={controls}
                card={card}
                owner={viewer}
                // Discards in the discard phase, otherwise selects or deselects the card
                onClick={() => controls.clickHandCard(card)}
                style={{
                  width: 50,
                  height: 65,
                  objectFit: "cover",
                  cursor: playable ? "pointer" : "not-allowed",
                  border: selected ? "2px solid yellow" : "1px solid black",
                  opacity: playable ? 1 : 0.5,
                  transform: selected ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.2s"
                }}
              />
            );
          })}
        </div>
      </div>

      <MessageBanner message={controls.message} onDismiss={controls.dismissMessage} style={{ fontSize: "12px", marginBottom: 8 }} />

      <TurnControls controls={controls} buttonStyle={{ padding: "6px 12px", fontSize: "12px" }} />
    </div>
  );
}
