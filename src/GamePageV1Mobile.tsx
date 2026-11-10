import { useRef, useState } from "react";
import { GameController } from "./controller/GameController";
import { AIController } from "./controller/AIController";
import { loadV1Assets } from "./app/loadV1Assets";
import type { Card } from "./model/cards/Card";

export default function GamePageV1Mobile() {
  // Mobile view - vertical scrolling layout
  const [, forceUpdate] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [discardPileExpanded, setDiscardPileExpanded] = useState(false);
  const controllerRef = useRef<GameController | null>(null);
  const aiControllerRef = useRef<AIController | null>(null);

  if (!controllerRef.current) {
    const { cardDefs, deckConfig } = loadV1Assets();
    const player2IsAI = true;
    controllerRef.current = new GameController(cardDefs, deckConfig, player2IsAI);
    aiControllerRef.current = new AIController(controllerRef.current);
  }

  const controller = controllerRef.current;
  const aiController = aiControllerRef.current;
  const game = controller.getGameState();

  const currentPlayerIndex = game.currentPlayerIndex;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;

  const currentPlayer = game.players[currentPlayerIndex];
  const opponent = game.players[opponentIndex];

  const rerender = () => forceUpdate((n) => n + 1);

  function renderField(field: (Card | null)[][], isOpponent: boolean) {
    const visualRows = isOpponent ? [...field].reverse() : field;

    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        {visualRows.map((row, visualRowIndex) => {
          const modelRowIndex = isOpponent
            ? field.length - 1 - visualRowIndex
            : visualRowIndex;

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
                
                const isVisible = cell && controller.isCardVisibleToPlayer(cell, isOpponent ? opponentIndex : currentPlayerIndex);
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

                      if (controller.getTurnType() === "attack") {
                        if (isOpponent) {
                          const result = controller.resolveAttack(modelRowIndex, modelColIndex);
                          if (!result.success) alert(result.reason);
                          setSelectedCardId(null);
                          rerender();
                          return;
                        } else {
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
                        src={`/assets/v1/cards/${isVisible && cell.facedUp ? (cell as any).front : (cell as any).back}`}
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
                src={`/assets/v1/cards/${controller.isCardVisibleToPlayer(card, opponentIndex) ? (card as any).front : (card as any).back}`}
                alt={card.name}
                style={{
                  width: 50,
                  height: 65,
                  objectFit: "cover",
                  cursor: controller.canInteractWithOpponentCard(opponent, card) ? "pointer" : "not-allowed",
                  border: "1px solid black",
                  opacity: controller.isCardVisibleToPlayer(card, opponentIndex) ? 1 : 0.6
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
                if (controller.canDrawCard(currentPlayerIndex)) {
                  controller.drawCard(currentPlayerIndex);
                  rerender();
                }
              }}
              style={{
                width: 80,
                height: 100,
                border: controller.canDrawCard(currentPlayerIndex) ? "3px solid green" : "2px solid black",
                backgroundColor: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: controller.canDrawCard(currentPlayerIndex) ? "pointer" : "not-allowed",
                overflow: "hidden",
                position: "relative"
              }}
            >
              {game.deck.size > 0 ? (
                <img
                  src={`/assets/v1/cards/${game.deck.deck[game.deck.deck.length - 1]?.back || "creature.jpg"}`}
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
            <p style={{ margin: "0 0 2px 0", fontSize: "11px" }}>Discard ({game.getDiscardPile().length})</p>
            <div
              onClick={() => {
                if (game.getDiscardPile().length > 0) {
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
                cursor: game.getDiscardPile().length > 0 ? "pointer" : "default"
              }}
            >
              {game.getDiscardPile().length > 0 ? (
                <img
                  src={`/assets/v1/cards/${game.getDiscardPile()[game.getDiscardPile().length - 1]?.front || "creature.jpg"}`}
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
            {discardPileExpanded && game.getDiscardPile().length > 0 && (
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
                {[...game.getDiscardPile()].reverse().map((card) => (
                  <div
                    key={card.instanceId}
                    onClick={() => {
                      const result = controller.selectDiscardPileCard(currentPlayer, selectedCardId, card);

                      if (!result.success) {
                        alert(`Cannot place card: ${result.reason}`);
                        return;
                      }

                      setSelectedCardId(null);
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
                      cursor: controller.canInteractWithDiscardPileCard(currentPlayer, card) ? "pointer" : "not-allowed",
                      opacity: controller.canInteractWithDiscardPileCard(currentPlayer, card) ? 1 : 0.5
                    }}
                  >
                    <img
                      src={`/assets/v1/cards/${(card as any).front}`}
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
                src={`/assets/v1/cards/${(card as any).front}`}
                alt={card.name}
                style={{
                  width: 50,
                  height: 65,
                  objectFit: "cover",
                  cursor: controller.canPlayHandCard(currentPlayer, card) ? "pointer" : "not-allowed",
                  border: selectedCardId === card.instanceId ? "2px solid yellow" : "1px solid black",
                  opacity: controller.canPlayHandCard(currentPlayer, card) ? 1 : 0.5,
                  transform: selectedCardId === card.instanceId ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.2s"
                }}
                onClick={() => {
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
              controller.endTurn();
              setSelectedCardId(null);
              
              const executeAITurnsRecursively = () => {
                const currentGame = controller.getGameState();
                if (currentGame.currentPlayer.isAI) {
                  setTimeout(() => {
                    (aiController as AIController).executeAITurn();
                    controller.endTurn();
                    rerender();
                    
                    executeAITurnsRecursively();
                  }, 500);
                } else {
                  rerender();
                }
              };
              
              executeAITurnsRecursively();
            }}
            disabled={controller.hasExtraHandCards(currentPlayer)}
            style={{ padding: "6px 12px", fontSize: "12px" }}
          >
            End Turn
          </button>
        )}
      </div>
    );
  }
}
