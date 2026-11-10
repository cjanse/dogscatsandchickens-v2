import { useState, useEffect } from "react";
import { GameController } from "./controller/GameController";
import { AIController } from "./controller/AIController";
import { loadV1Assets } from "./app/loadV1Assets";
import type { Card } from "./model/cards/Card";

export default function GamePageV1() {
  // This is the game view using card images. Initially copied from diagnostics.
  // Will be modified to display card images instead of text.
  const [, forceUpdate] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [discardPileExpanded, setDiscardPileExpanded] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  // Created once; the controller is a stable mutable object (views call forceUpdate after mutations).
  const [{ controller, aiController }] = useState(() => {
    const { cardDefs, deckConfig } = loadV1Assets();
    // Set to true to play against AI, false for two human players
    const player2IsAI = true;
    const controller = new GameController(cardDefs, deckConfig, player2IsAI);
    return { controller, aiController: new AIController(controller) };
  });

  // Listen for window resize events
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const game = controller.getGameState();

  //Getting player info
  const currentPlayerIndex = game.currentPlayerIndex;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;

  const currentPlayer = game.players[currentPlayerIndex];
  const opponent = game.players[opponentIndex];

  const rerender = () => forceUpdate((n) => n + 1);

  // Calculate responsive sizes based on viewport
  const viewportWidth = windowSize.width;
  const viewportHeight = windowSize.height;
  
  // Side columns get equal space minus center column (roughly 180px) and gaps
  const sideColumnWidth = (viewportWidth - 200) / 2;
  
  // Scale hand cards based on available width (aim for ~5-6 cards per row)
  const handCardWidth = Math.max(25, sideColumnWidth * 0.15);
  const handCardHeight = handCardWidth * 1.3;
  
  // Scale field cards proportionally
  const fieldCardWidth = Math.max(35, sideColumnWidth * 0.2);
  const fieldCardHeight = fieldCardWidth * 1.3;
  
  // Scale center column deck/discard cards
  const deckCardWidth = fieldCardWidth;
  const deckCardHeight = fieldCardHeight;
  
  // Scale font sizes proportionally
  const baseFontSize = Math.max(7, viewportHeight * 0.015);
  const headerFontSize = baseFontSize * 1.3;
  const smallFontSize = baseFontSize * 0.85;

  //Helper function to assist with rendering the field
  function renderField(
    field: (Card | null)[][],
    isOpponent: boolean,
    compact: boolean = false
  ) {
    const visualRows = isOpponent ? [...field].reverse() : field;

    // Calculate a single dynamicCardWidth/dynamicCardHeight for the entire field
    let maxColsToShow = 1;
    let hasAnyCardsAnywhere = false;
    visualRows.forEach((row) => {
      const hasAnyCards = row.some(card => card !== null);
      const hasCreature = row.some(card => card?.type === "creature");
      const hasUpgrade = row.some(card => card?.type === "upgrade");
      let colsToShow = 1;
      if (hasAnyCards && hasCreature && !hasUpgrade) {
        colsToShow = 3;
      } else if (hasAnyCards && hasCreature && hasUpgrade) {
        colsToShow = 4;
      }
      if (colsToShow > maxColsToShow) maxColsToShow = colsToShow;
      if (hasAnyCards) hasAnyCardsAnywhere = true;
    });
    let dynamicCardWidth;
    if (!hasAnyCardsAnywhere) {
      dynamicCardWidth = 40;
    } else {
      const totalGap = (maxColsToShow - 1) * 2;
      dynamicCardWidth = Math.max(35, Math.min(110, (sideColumnWidth - totalGap) / maxColsToShow));
    }
    const dynamicCardHeight = dynamicCardWidth * 1.3;
    const marginRight = compact ? 1 : 2;
    const marginBottom = compact ? 1 : 2;

    return (
      <div style={{ display: "flex", justifyContent: "center", overflowX: "auto", width: "100%" }}>
        {visualRows.map((row, visualRowIndex) => {
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
                marginRight: marginRight
              }}
            >
              {visualCols.map((cell, visualColIndex) => {
                if (isOpponent) {
                  if (visualColIndex < visualCols.length - maxColsToShow) return null;
                } else {
                  if (visualColIndex >= maxColsToShow) return null;
                }
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
                    className="field-card-container"
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
                      width: dynamicCardWidth,
                      height: dynamicCardHeight,
                      border: "1px solid black",
                      marginBottom: marginBottom,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f5f5f5",
                      borderColor: isSelected ? borderColor : "black",
                      borderWidth: 1,
                      cursor: isSelected ? cursor : "default",
                      padding: 0,
                      overflow: "visible",
                      boxSizing: "border-box"
                    }}
                  >
                    {cell ? (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#fff"
                      }}>
                        <img
                          className="field-card-image"
                          src={
                            isOpponent
                              ? `/assets/v1/cards/${isVisible && cell.facedUp ? cell.front : cell.back}`
                              : `/assets/v1/cards/${cell.front}`
                          }
                          alt={cell.name}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                            display: "block",
                            opacity: !isOpponent && !(isVisible && cell.facedUp) ? 0.5 : 1
                          }}
                        />
                      </div>
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
      <div style={{ padding: 2, display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 4, height: "100vh", width: "100%", overflow: "hidden" }}>
        
        {/* LEFT COLUMN: Opponent */}
        <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 }}>
          <h4 style={{ margin: "1px 0", fontSize: `${headerFontSize}px` }}>{opponent.id}</h4>
          <p style={{ margin: "0px 0", fontSize: `${smallFontSize}px` }}>Hand ({opponent.hand.length})</p>
          <div style={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", marginBottom: 3 }}>
            {opponent.hand.map((card) => (
              <img
                key={card.instanceId}
                src={`/assets/v1/cards/${controller.isCardVisibleToPlayer(card, opponentIndex) ? card.front : card.back}`}
                alt={card.name}
                style={{
                  width: handCardWidth,
                  height: handCardHeight,
                  objectFit: "contain",
                  cursor: controller.canInteractWithOpponentCard(opponent, card) ? "pointer" : "not-allowed",
                  border: "0.5px solid black",
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
          {renderField(opponent.field, true, true)}
        </div>

        {/* CENTER COLUMN: Deck, Discard, Turn Info, and Actions */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, justifyContent: "center", height: "100%" }}>
          {/* Deck */}
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "1px 0", fontSize: `${smallFontSize}px` }}>Deck ({game.deck.size})</p>
            <div
              onClick={() => {
                if (controller.canDrawCard(currentPlayerIndex)) {
                  controller.drawCard(currentPlayerIndex);
                  rerender();
                }
              }}
              style={{
                width: deckCardWidth,
                height: deckCardHeight,
                border: controller.canDrawCard(currentPlayerIndex) ? "2px solid green" : "1px solid black",
                backgroundColor: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: controller.canDrawCard(currentPlayerIndex) ? "pointer" : "not-allowed",
                overflow: "hidden",
                fontSize: "8px"
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
            <p style={{ margin: "1px 0", fontSize: `${smallFontSize}px` }}>Discard ({game.getDiscardPile().length})</p>
            <div
              onClick={() => {
                if (game.getDiscardPile().length > 0) {
                  setDiscardPileExpanded(!discardPileExpanded);
                }
              }}
              style={{
                width: deckCardWidth,
                height: deckCardHeight,
                border: "1px solid black",
                backgroundColor: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                cursor: game.getDiscardPile().length > 0 ? "pointer" : "default",
                fontSize: "8px"
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
                  top: 100,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: 6,
                  backgroundColor: "#f9f9f9",
                  border: "1px solid black",
                  borderRadius: 2,
                  maxHeight: 250,
                  overflowY: "auto",
                  zIndex: 10,
                  width: 120
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
                      gap: 4,
                      padding: 4,
                      backgroundColor: "white",
                      border: "0.5px solid #ccc",
                      borderRadius: 2,
                      cursor: controller.canInteractWithDiscardPileCard(currentPlayer, card) ? "pointer" : "not-allowed",
                      opacity: controller.canInteractWithDiscardPileCard(currentPlayer, card) ? 1 : 0.5,
                      fontSize: "9px"
                    }}
                  >
                    <img
                      src={`/assets/v1/cards/${card.front}`}
                      alt={card.name}
                      style={{
                        width: 25,
                        height: 30,
                        objectFit: "contain",
                        border: "0.5px solid black"
                      }}
                    />
                    <span style={{ fontSize: "8px" }}>{card.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Turn Info Box */}
          <div style={{ 
            backgroundColor: "#e8e8e8", 
            padding: 3, 
            borderRadius: 2, 
            border: "1px solid black",
            fontSize: `${smallFontSize}px`,
            textAlign: "center",
            minWidth: 100
          }}>
            <p style={{ margin: "0px 0" }}>Moves: {controller.getMovesLeft()} / {controller.getMaxMoves()}</p>
            <p style={{ margin: "0px 0" }}>Turn: {controller.getTurnType()}</p>
          </div>

          {/* Turn Actions: Discard / End Turn */}
          <div>
            {controller.hasExtraHandCards(currentPlayer) && controller.getPendingAction() !== "discardExtraCards" ? (
              <button
                onClick={() => {
                  const result = controller.startDiscardPhase();
                  if (!result.success) {
                    alert(result.reason);
                  }
                  rerender();
                }}
                style={{ padding: "4px 8px", fontSize: "10px" }}
              >
                Discard Extra
              </button>
            ) : (
              <button
                onClick={() => {
                  const endResult = controller.endTurn();
                  if (!endResult.success) {
                    alert(endResult.reason);
                    return;
                  }
                  setSelectedCardId(null);
                  
                  const executeAITurnsRecursively = () => {
                    const currentGame = controller.getGameState();
                    if (currentGame.currentPlayer.isAI && !controller.isGameOver()) {
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
                disabled={controller.hasExtraHandCards(currentPlayer) || !controller.canEndTurn()}
                style={{ padding: "4px 8px", fontSize: "10px" }}
              >
                End Turn
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Current Player */}
        <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" }}>
          <h4 style={{ margin: "1px 0", fontSize: `${headerFontSize}px` }}>{currentPlayer.id}</h4>

          {/* Scrollable area: field + hand */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ marginBottom: 3 }}>
              {renderField(currentPlayer.field, false, true)}
            </div>

            <p style={{ margin: "0px 0", fontSize: `${smallFontSize}px` }}>Hand ({currentPlayer.hand.length})</p>
            <div style={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", marginBottom: 3 }}>
              {currentPlayer.hand.map((card) => (
                <img
                  key={card.instanceId}
                  className="hand-card-image"
                  src={`/assets/v1/cards/${card.front}`}
                  alt={card.name}
                  style={{
                    width: handCardWidth,
                    height: handCardHeight,
                    objectFit: "contain",
                    cursor: controller.canPlayHandCard(currentPlayer, card) ? "pointer" : "not-allowed",
                    border: selectedCardId === card.instanceId ? "1.5px solid yellow" : "0.5px solid black",
                    opacity: controller.canPlayHandCard(currentPlayer, card) ? 1 : 0.5,
                    transform: selectedCardId === card.instanceId ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.2s"
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
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }
}
