import { useRef, useState } from "react";
import { GameController } from "./controller/GameController";
import { AIController } from "./controller/AIController";
import { loadV1Assets } from "./app/loadV1Assets";
import type { Card } from "./model/cards/Card";

export default function GamePageV1() {
  const [, forceUpdate] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const controllerRef = useRef<GameController | null>(null);
  const aiControllerRef = useRef<AIController | null>(null);

  if (!controllerRef.current) {
    const { cardDefs, deckConfig } = loadV1Assets();
    // Set to true to play against AI, false for two human players
    const player2IsAI = true;
    controllerRef.current = new GameController(cardDefs, deckConfig, player2IsAI);
    aiControllerRef.current = new AIController(controllerRef.current);
  }

  const controller = controllerRef.current;
  const aiController = aiControllerRef.current;
  const game = controller.getGameState();

  //Getting player info
  const currentPlayerIndex = game.currentPlayerIndex;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;

  const currentPlayer = game.players[currentPlayerIndex];
  const opponent = game.players[opponentIndex];

  const rerender = () => forceUpdate((n) => n + 1);

  //Helper function to assist with rendering the field
  function renderField(
    field: (Card | null)[][],
    isOpponent: boolean
  ) {
    const visualRows = isOpponent ? [...field].reverse() : field;

    return (
      <div style={{ display: "flex" }}>
        {visualRows.map((row, visualRowIndex) => {
          // Map visual row index back to model row index
          const modelRowIndex = isOpponent
            ? field.length - 1 - visualRowIndex
            : visualRowIndex;

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
                const isVisible = cell && controller.isCardVisibleToPlayer(cell, isOpponent ? opponentIndex : currentPlayerIndex);

                //Determines canClick logic
                const isSelected = selectedCardId !== null;

                const canPlaceHere =
                  controller.canPlayCard(
                    isOpponent ? opponentIndex: currentPlayerIndex,
                    selectedCardId,
                    modelRowIndex,
                    modelColIndex
                  );

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

                      // Attack flow
                      if (controller.getTurnType() === "attack") {
                        // If clicking on opponent's creature, resolve the attack
                        if (isOpponent) {
                          const result = controller.resolveAttack(modelRowIndex, modelColIndex);
                          if (!result.success) alert(result.reason);
                          setSelectedCardId(null);
                          rerender();
                          return;
                        } else {
                          // If clicking on your own creature, start a new attack (for matched cats)
                          const result = controller.startAttack(modelRowIndex, modelColIndex);
                          if (result.success) {
                            setSelectedCardId(
                              currentPlayer.field[modelRowIndex][modelColIndex]!.instanceId
                            );
                          }
                          rerender();
                          return;
                        }
                      }

                      if (
                        controller.getMovesLeft() === controller.getMaxMoves() &&
                        !selectedCardId
                      ) {
                        const result = controller.startAttack(modelRowIndex, modelColIndex);
                        if (result.success) {
                          setSelectedCardId(
                            currentPlayer.field[modelRowIndex][modelColIndex]!.instanceId
                          );
                        }
                        rerender();
                        return;
                      }

                      // Reinforce
                      const result = controller.playCard(
                        isOpponent ? opponentIndex : currentPlayerIndex,
                        selectedCardId as string,
                        modelRowIndex,
                        modelColIndex
                      );

                      if (!result.success) alert(result.reason);
                      setSelectedCardId(null);
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
        <h1>Dogs, Cats, and Chickens (v1)</h1>

        <p>Deck size: {game.deck.size}</p>
        <ul>
        {game.deck.deck.map((card) => (
          <li key={card.instanceId}>
            {card.name} ({card.type})
          </li>
        ))}
        </ul>
        <p>Current player: {currentPlayer.id}</p>

        {/* Opponent */}
        <div style={{ marginBottom: 32 }}>
          <h2>{opponent.id}</h2>

          <p>Hand ({opponent.hand.length} cards)</p>
          <ul>
            {opponent.hand.map((card) => (
              <li key={card.instanceId}
              style={{
                    backgroundColor: controller.isCardVisibleToPlayer(card, opponentIndex) ? "transparent" : "gray",
                    cursor: controller.canInteractWithOpponentCard(opponent, card) ? "pointer" : "not-allowed"
                  }}
              onClick={() => {
                const result = controller.interactWithOpponentCard(opponent, selectedCardId, card);

                if (!result.success) {
                  alert(`Cannot place card: ${result.reason}`);
                  return;
                }

                setSelectedCardId(null);
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
                    backgroundColor: selectedCardId === card.instanceId ? "yellow" : "transparent",
                    fontWeight: selectedCardId === card.instanceId ? "bold" : "normal"
                  }}
              onClick={() => {
                // If in discard phase, discard the card
                if (controller.getPendingAction() === "discardExtraCards") {
                  const result = controller.discardHandCard(card);
                  if (!result.success) {
                    alert(`Cannot discard card: ${result.reason}`);
                    return;
                  }
                  rerender();
                  return;
                }

                if (selectedCardId === card.instanceId) {
                  controller.resetTemporaryEffectsIfNeeded();
                  setSelectedCardId(null);
                  return;
                }

                const result = controller.playHandCard(currentPlayer, card);

                if (result.success) {
                  setSelectedCardId(card.instanceId);
                }
                else {
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
              controller.drawCard(currentPlayerIndex);
              rerender();
            }}
            style={{
            cursor: controller.canDrawCard(currentPlayerIndex) ? "pointer" : "not-allowed"
            }}
          >
            Draw Card
          </button>
        </div>
          <p>Discard pile ({game.getDiscardPile().length})</p>
          <ul>
            {game.getDiscardPile().map(card => (
              <li key={card.instanceId}
              style={{
                    cursor: controller.canInteractWithDiscardPileCard(currentPlayer, card) ? "pointer" : "not-allowed"
                  }}
              onClick={() => {
                const result = controller.selectDiscardPileCard(currentPlayer, selectedCardId, card);

                if (!result.success) {
                  alert(`Cannot place card: ${result.reason}`);
                  return;
                }

                setSelectedCardId(null);
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
              controller.endTurn();
              setSelectedCardId(null);
              
              // Recursive function to handle AI turns
              const executeAITurnsRecursively = () => {
                const currentGame = controller.getGameState();
                if (currentGame.currentPlayer.isAI) {
                  // Use setTimeout to allow re-render before AI executes
                  setTimeout(() => {
                    aiController.executeAITurn();
                    controller.endTurn();
                    rerender();
                    
                    // Check if next player is also AI and recursively execute
                    executeAITurnsRecursively();
                  }, 500);
                } else {
                  rerender();
                }
              };
              
              executeAITurnsRecursively();
            }}
            disabled={controller.hasExtraHandCards(currentPlayer)}
          >
            End Turn
          </button>
        )}
      </div>
    );
  }
}
