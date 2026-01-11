import { useRef, useState } from "react";
import { GameController } from "./controller/GameController";
import { loadV1Assets } from "./app/loadV1Assets";
import type { Card } from "./model/cards/Card";

export default function App() {
  const [, forceUpdate] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const controllerRef = useRef<GameController | null>(null);

  if (!controllerRef.current) {
    const { cardDefs, deckConfig } = loadV1Assets();
    controllerRef.current = new GameController(cardDefs, deckConfig);
  }

  const controller = controllerRef.current;
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

                return (
                  <div
                    key={visualColIndex}
                    onClick={() => {
                      if (!selectedCardId) return;

                      // Use model indices here
                      controller.playCard(
                        isOpponent ? opponentIndex: currentPlayerIndex,
                        selectedCardId,
                        modelRowIndex,
                        modelColIndex
                      );

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
                      backgroundColor: cell ? "#eee" : "white"
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
                  cursor: "pointer",
                  fontWeight: selectedCardId === card.instanceId ? "bold" : "normal"
                }}
            onClick={() => setSelectedCardId(card.instanceId)}
            >{card.name}</li>
          ))}
        </ul>

        <button
          onClick={() => {
            controller.drawCard(currentPlayerIndex);
            rerender();
          }}
        >
          Draw Card
        </button>
      </div>

      <hr />

      <button
        onClick={() => {
          controller.endTurn();
          setSelectedCardId(null);
          rerender();
        }}
      >
        End Turn
      </button>
    </div>
  );
}