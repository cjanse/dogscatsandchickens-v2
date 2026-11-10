import { useState, useEffect } from "react";
import { GameController } from "./controller/GameController";
import { loadV1Assets } from "./app/loadV1Assets";
import { cardBackUrl, cardFrontUrl } from "./app/cardImages";
import { fieldRowsWithPlaceholders } from "./app/fieldRows";
import type { FieldView } from "./model/game/views";

export default function GamePageV1Mobile() {
  // Mobile view - vertical scrolling layout
  const [, forceUpdate] = useState(0);
  const [discardPileExpanded, setDiscardPileExpanded] = useState(false);
  // Created once; the controller is a stable mutable object (views call forceUpdate after mutations).
  const [controller] = useState(() => {
    const { cardDefs, deckConfig } = loadV1Assets();
    // Set to true to play against AI, false for two human players
    const player2IsAI = true;
    return new GameController(cardDefs, deckConfig, player2IsAI);
  });

  // The controller runs the AI's turns itself and tells us when something changed
  useEffect(() => {
    const unsubscribe = controller.subscribe(() => forceUpdate((n) => n + 1));
    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);

  const game = controller.getGameState();

  const currentPlayerIndex = game.currentPlayerIndex;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;

  const currentPlayer = game.players[currentPlayerIndex];
  const opponent = game.players[opponentIndex];

  const rerender = () => forceUpdate((n) => n + 1);

  function renderField(field: FieldView, isOpponent: boolean) {
    const fieldRows = fieldRowsWithPlaceholders(field);
    const visualRows = isOpponent ? [...fieldRows].reverse() : fieldRows;

    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        {visualRows.map((rowEntry, visualRowIndex) => {
          const modelRowIndex = rowEntry.modelRow;
          const row = rowEntry.cells;

          const visualCols = isOpponent ? [...row].reverse() : row;

          const hasAnyCards = row.some(card => card !== null);
          const hasCreature = row.some(card => card?.type === "creature");
          const hasUpgrade = row.some(card => card?.type === "upgrade");

          let colsToShow = 1;
          if (hasAnyCards && hasCreature && !hasUpgrade) {
            colsToShow = 3;
          } else if (hasAnyCards && hasCreature && hasUpgrade) {
            colsToShow = 4;
          }

          return (
            <div
              key={visualRowIndex}
              style={{
                display: "flex",
                flexDirection: "column",
                marginRight: 6
              }}
            >
              {visualCols.slice(0, colsToShow).map((cell, visualColIndex) => {
                const modelColIndex = isOpponent
                  ? row.length - 1 - visualColIndex
                  : visualColIndex;
                
                const fieldOwner = isOpponent ? opponent : currentPlayer;
                const isVisible = cell && controller.isCardVisibleToPlayer(cell, fieldOwner);
                const isSelected = controller.getSelectedCard() !== null;

                const canPlaceHere = controller.canClickField(fieldOwner, modelRowIndex, modelColIndex);

                let borderColor = "black";
                let cursor = "default";

                if (canPlaceHere) {
                  borderColor = "green";
                  cursor = "pointer";
                } else {
                  borderColor = "red";
                }

                return (
                  <div
                    key={visualColIndex}
                    onClick={() => {
                      if (!canPlaceHere) return;

                      // The controller decides whether this click attacks, places a card or targets Power of Tea
                      const result = controller.clickField(fieldOwner, modelRowIndex, modelColIndex);
                      if (!result.success) alert(result.reason);
                      rerender();
                    }}
                    style={{
                      width: 80,
                      height: 100,
                      border: "2px solid black",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f5f5f5",
                      borderColor: isSelected ? borderColor : "black",
                      borderWidth: 2,
                      cursor: isSelected ? cursor : "default",
                      padding: 0,
                      overflow: "hidden"
                    }}
                  >
                    {cell ? (
                      <img
                        src={isVisible && cell.facedUp ? cardFrontUrl(cell) : cardBackUrl(cell)}
                        alt={cell.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }
  
  const result = controller.getGameResult();
  if (result.state !== "ongoing") {
    return (
      <div>
        {result.state === "tie" && <h1>It's a Tie!</h1>}
        {result.state === "loss" && <h1>Player {result.loserId} Loses</h1>}
      </div>
    );
  }
  else {
    return (
      <div style={{ padding: 8, display: "flex", flexDirection: "column", alignItems: "center", height: "100vh", overflow: "auto" }}>
        <h3 style={{ margin: "2px 0", fontSize: "16px" }}>Dogs, Cats, and Chickens (v1) - Mobile</h3>

        {/* Opponent */}
        <div style={{ marginBottom: 12, textAlign: "center" }}>
          <h4 style={{ margin: "2px 0", fontSize: "14px" }}>{opponent.id}</h4>

          <p style={{ margin: "2px 0", fontSize: "11px" }}>Hand ({opponent.hand.length})</p>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 6 }}>
            {opponent.hand.map((card) => (
              <img
                key={card.instanceId}
                src={controller.isCardVisibleToPlayer(card, opponent) ? cardFrontUrl(card) : cardBackUrl(card)}
                alt={card.name}
                style={{
                  width: 50,
                  height: 65,
                  objectFit: "cover",
                  cursor: controller.canInteractWithOpponentCard(opponent) ? "pointer" : "not-allowed",
                  border: "1px solid black",
                  opacity: controller.isCardVisibleToPlayer(card, opponent) ? 1 : 0.6
                }}
                onClick={() => {
                  const result = controller.interactWithOpponentCard(opponent, card);

                  if (!result.success) {
                    alert(`Cannot place card: ${result.reason}`);
                    return;
                  }

                  rerender();
                }}
              />
            ))}
          </div>
          <div>
            {renderField(
              opponent.field,
              true
            )}
          </div>
        </div>

        {/* Deck and Discard Pile */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center", margin: "10px 0", alignItems: "flex-start" }}>
          {/* Deck Pile */}
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 2px 0", fontSize: "11px" }}>Deck ({game.deck.size})</p>
            <div
              onClick={() => {
                if (controller.canDrawCard(currentPlayer)) {
                  controller.drawCard(currentPlayer);
                  rerender();
                }
              }}
              style={{
                width: 80,
                height: 100,
                border: controller.canDrawCard(currentPlayer) ? "3px solid green" : "2px solid black",
                backgroundColor: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: controller.canDrawCard(currentPlayer) ? "pointer" : "not-allowed",
                overflow: "hidden",
                position: "relative"
              }}
            >
              {game.deck.size > 0 ? (
                <img
                  src={cardBackUrl(game.deck.peek())}
                  alt="Deck"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <span>Empty</span>
              )}
            </div>
          </div>

          {/* Discard Pile */}
          <div style={{ textAlign: "center", position: "relative" }}>
            <p style={{ margin: "0 0 2px 0", fontSize: "11px" }}>Discard ({game.discardPile.length})</p>
            <div
              onClick={() => {
                if (game.discardPile.length > 0) {
                  setDiscardPileExpanded(!discardPileExpanded);
                }
              }}
              style={{
                width: 80,
                height: 100,
                border: "2px solid black",
                backgroundColor: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                cursor: game.discardPile.length > 0 ? "pointer" : "default"
              }}
            >
              {game.discardPile.length > 0 ? (
                <img
                  src={cardFrontUrl(game.discardPile[game.discardPile.length - 1])}
                  alt="Discard"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <span>Empty</span>
              )}
            </div>

            {/* Expanded Discard Pile */}
            {discardPileExpanded && game.discardPile.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 120,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 12,
                  backgroundColor: "#f9f9f9",
                  border: "2px solid black",
                  borderRadius: 4,
                  maxHeight: 400,
                  overflowY: "auto",
                  zIndex: 10
                }}
              >
                {[...game.discardPile].reverse().map((card) => (
                  <div
                    key={card.instanceId}
                    onClick={() => {
                      const result = controller.selectDiscardPileCard(card);

                      if (!result.success) {
                        alert(`Cannot place card: ${result.reason}`);
                        return;
                      }

                      setDiscardPileExpanded(false);
                      rerender();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 8,
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      cursor: controller.canInteractWithDiscardPileCard(card) ? "pointer" : "not-allowed",
                      opacity: controller.canInteractWithDiscardPileCard(card) ? 1 : 0.5
                    }}
                  >
                    <img
                      src={cardFrontUrl(card)}
                      alt={card.name}
                      style={{
                        width: 50,
                        height: 60,
                        objectFit: "cover",
                        border: "1px solid black"
                      }}
                    />
                    <span>{card.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current Player */}
        <div style={{ textAlign: "center" }}>
          <h4 style={{ margin: "2px 0", fontSize: "14px" }}>
            {currentPlayer.id} | Moves: {controller.getMovesLeft()} / {controller.getMaxMoves()} | Turn: {controller.getTurnType()}
          </h4>

          <p style={{ margin: "2px 0", fontSize: "11px" }}>Hand ({currentPlayer.hand.length})</p>

          <div style={{ marginBottom: 8 }}>
            {renderField(
              currentPlayer.field,
              false
            )}
          </div>

          <p style={{ margin: "4px 0", fontSize: "11px" }}>Hand</p>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
            {currentPlayer.hand.map((card) => (
              <img
                key={card.instanceId}
                src={cardFrontUrl(card)}
                alt={card.name}
                style={{
                  width: 50,
                  height: 65,
                  objectFit: "cover",
                  cursor: controller.canPlayHandCard(currentPlayer, card) ? "pointer" : "not-allowed",
                  border: controller.getSelectedCard() === card ? "2px solid yellow" : "1px solid black",
                  opacity: controller.canPlayHandCard(currentPlayer, card) ? 1 : 0.5,
                  transform: controller.getSelectedCard() === card ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.2s"
                }}
                onClick={() => {
                  // Discards in the discard phase, otherwise selects or deselects the card
                  const result = controller.clickHandCard(currentPlayer, card);
                  if (!result.success) {
                    alert(`Cannot play card: ${result.reason}`);
                    return;
                  }
                  rerender();
                }}
              />
            ))}
          </div>
        </div>

        {controller.hasExtraHandCards(currentPlayer) && controller.getPendingAction() !== "discardExtraCards" ? (
          <button
            onClick={() => {
              const result = controller.startDiscardPhase();
              if (!result.success) {
                alert(result.reason);
              }
              rerender();
            }}
            style={{ padding: "6px 12px", fontSize: "12px" }}
          >
            Discard Extra Cards
          </button>
        ) : (
          <button
            onClick={() => {
              // The controller also plays the AI's turns and notifies us as they happen
              const endResult = controller.finishTurn();
              if (!endResult.success) {
                alert(endResult.reason);
                return;
              }
              rerender();
            }}
            disabled={controller.hasExtraHandCards(currentPlayer) || !controller.canEndTurn()}
            style={{ padding: "6px 12px", fontSize: "12px" }}
          >
            End Turn
          </button>
        )}
      </div>
    );
  }
}
