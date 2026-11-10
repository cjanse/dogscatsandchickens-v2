import { useState, useEffect } from "react";
import { GameController } from "./controller/GameController";
import { loadV1Assets } from "./app/loadV1Assets";
import { fieldRowsWithPlaceholders } from "./app/fieldRows";
import type { FieldView } from "./model/game/views";

export default function GamePageV1Diagnostics() {
  const [, forceUpdate] = useState(0);
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

  //Getting player info
  const currentPlayerIndex = game.currentPlayerIndex;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;

  const currentPlayer = game.players[currentPlayerIndex];
  const opponent = game.players[opponentIndex];

  const rerender = () => forceUpdate((n) => n + 1);

  //Helper function to assist with rendering the field
  function renderField(
    field: FieldView,
    isOpponent: boolean
  ) {
    const fieldRows = fieldRowsWithPlaceholders(field);
    const visualRows = isOpponent ? [...fieldRows].reverse() : fieldRows;

    return (
      <div style={{ display: "flex" }}>
        {visualRows.map((rowEntry, visualRowIndex) => {
          // The model row index (-1 and field.length are the new rows above and below the field)
          const modelRowIndex = rowEntry.modelRow;
          const row = rowEntry.cells;

          const visualCols = isOpponent ? [...row].reverse() : row;

          return (
            <div
              key={visualRowIndex}
              style={{
                display: "flex",
                flexDirection: "column",
                marginRight: 6
              }}
            >
              {visualCols.map((cell, visualColIndex) => {
                // Map visual column index back to model column index
                const modelColIndex = isOpponent
                  ? row.length - 1 - visualColIndex
                  : visualColIndex;
                
                //Determines visibility
                const fieldOwner = isOpponent ? opponent : currentPlayer;
                const isVisible = cell && controller.isCardVisibleToPlayer(cell, fieldOwner);

                //Determines canClick logic
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
                      border: "1px solid black",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: cell ? (isVisible && cell.facedUp ? "white" : "#ccc") : "white",
                      borderColor: isSelected ? borderColor : "black",
                      borderWidth: 2,
                      cursor: isSelected ? cursor : "default"
                    }}
                  >
                    {cell ? cell.name : ""}
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
      <div style={{ padding: 16 }}>
        <h1>Dogs, Cats, and Chickens (v1) - Diagnostics</h1>

        <p>Deck size: {game.deck.size}</p>
        <p>Current player: {currentPlayer.id}</p>

        {/* Opponent */}
        <div style={{ marginBottom: 32 }}>
          <h2>{opponent.id}</h2>

          <p>Hand ({opponent.hand.length} cards)</p>
          <ul>
            {opponent.hand.map((card) => (
              <li key={card.instanceId}
              style={{
                    backgroundColor: controller.isCardVisibleToPlayer(card, opponent) ? "transparent" : "gray",
                    cursor: controller.canInteractWithOpponentCard(opponent) ? "pointer" : "not-allowed"
                  }}
              onClick={() => {
                const result = controller.interactWithOpponentCard(opponent, card);

                if (!result.success) {
                  alert(`Cannot place card: ${result.reason}`);
                  return;
                }

                rerender();
              }}
              >{card.name}</li>
            ))}
          </ul>
          <div>
            {renderField(
              opponent.field,
              true // opponent field flipped vertically
            )}
          </div>
        </div>

        {/* Current Player */}
        <div>
          <h2>{currentPlayer.id} (Your Turn)</h2>

          <div style={{ marginBottom: 8 }}>
            {renderField(
              currentPlayer.field,
              false // normal orientation
            )}
          </div>

          <p>Hand ({currentPlayer.hand.length})</p>

          <ul>
            {currentPlayer.hand.map((card) => (
              <li key={card.instanceId}
              style={{
                    cursor: controller.canPlayHandCard(currentPlayer, card) ? "pointer" : "not-allowed",
                    backgroundColor: controller.getSelectedCard() === card ? "yellow" : "transparent",
                    fontWeight: controller.getSelectedCard() === card ? "bold" : "normal"
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
              >{card.name}</li>
            ))}
          </ul>

          <button
            onClick={() => {
              controller.drawCard(currentPlayer);
              rerender();
            }}
            style={{
            cursor: controller.canDrawCard(currentPlayer) ? "pointer" : "not-allowed"
            }}
          >
            Draw Card
          </button>
        </div>
          <p>Discard pile ({game.discardPile.length})</p>
          <ul>
            {game.discardPile.map(card => (
              <li key={card.instanceId}
              style={{
                    cursor: controller.canInteractWithDiscardPileCard(card) ? "pointer" : "not-allowed"
                  }}
              onClick={() => {
                const result = controller.selectDiscardPileCard(card);

                if (!result.success) {
                  alert(`Cannot place card: ${result.reason}`);
                  return;
                }

                rerender();
              }}
              >{card.name}</li>
            ))}
          </ul>
        <hr />
        <p>
          Moves left this turn: {controller.getMovesLeft()} / {controller.getMaxMoves()}
        </p>
        <p>Turn type: {controller.getTurnType()}</p>
        {controller.hasExtraHandCards(currentPlayer) && controller.getPendingAction() !== "discardExtraCards" ? (
          <button
            onClick={() => {
              const result = controller.startDiscardPhase();
              if (!result.success) {
                alert(result.reason);
              }
              rerender();
            }}
          >
            Discard Extra Hand Cards
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
          >
            End Turn
          </button>
        )}
      </div>
    );
  }
}
