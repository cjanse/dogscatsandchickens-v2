import { useGameController } from "./app/useGameController";
import { fieldRowsWithPlaceholders, visualCells } from "./app/fieldRows";
import type { PlayerView } from "./model/game/views";
import { FieldCell } from "./view/components/FieldCell";
import { GameOverScreen } from "./view/components/GameOverScreen";
import { MessageBanner } from "./view/components/MessageBanner";
import { TurnControls } from "./view/components/TurnControls";

/** Text-only debug view: every field slot is shown, and cards are listed by name. */
export default function GamePageV1Diagnostics() {
  const controls = useGameController();
  const { game, queries, viewer, opponent } = controls;

  function renderField(owner: PlayerView, isOpponent: boolean) {
    const fieldRows = fieldRowsWithPlaceholders(owner.field);
    const visualRows = isOpponent ? [...fieldRows].reverse() : fieldRows;

    return (
      <div style={{ display: "flex" }}>
        {visualRows.map((rowEntry) => (
          <div key={rowEntry.modelRow} style={{ display: "flex", flexDirection: "column", marginRight: 6 }}>
            {visualCells(rowEntry.cells, isOpponent).map(({ cell, modelCol }) => (
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
                  // Grey: face down (hidden from the opponent)
                  backgroundColor: cell && !(queries.isCardVisibleToPlayer(cell, owner) && queries.isFaceUp(cell)) ? "#ccc" : "white",
                }}
              >
                {cell ? cell.name : ""}
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
    <div style={{ padding: 16 }}>
      <h1>Dogs, Cats, and Chickens (v1) - Diagnostics</h1>

      <p>Deck size: {game.deck.size}</p>
      <p>Current player: {game.players[game.currentPlayerIndex].id}{controls.isMyTurn ? "" : " (AI)"}</p>

      {/* Opponent */}
      <div style={{ marginBottom: 32 }}>
        <h2>{opponent.id}</h2>

        <p>Hand ({opponent.hand.length} cards)</p>
        <ul>
          {opponent.hand.map((card) => {
            const visible = queries.isCardVisibleToPlayer(card, opponent);
            return (
              <li
                key={card.instanceId}
                style={{
                  backgroundColor: visible ? "transparent" : "gray",
                  cursor: queries.canInteractWithOpponentCard(opponent) ? "pointer" : "not-allowed"
                }}
                onClick={() => controls.clickOpponentHandCard(card)}
              >
                {/* This view is for debugging, so hidden cards still show their name on a grey background */}
                {card.name}
              </li>
            );
          })}
        </ul>
        {renderField(opponent, true)}
      </div>

      {/* You (the viewer) */}
      <div>
        <h2>{viewer.id} (You)</h2>

        <div style={{ marginBottom: 8 }}>
          {renderField(viewer, false)}
        </div>

        <p>Hand ({viewer.hand.length})</p>
        <ul>
          {viewer.hand.map((card) => {
            const selected = queries.getSelectedCard()?.instanceId === card.instanceId;
            return (
              <li
                key={card.instanceId}
                style={{
                  cursor: queries.canPlayHandCard(viewer, card) ? "pointer" : "not-allowed",
                  backgroundColor: selected ? "yellow" : "transparent",
                  fontWeight: selected ? "bold" : "normal"
                }}
                // Discards in the discard phase, otherwise selects or deselects the card
                onClick={() => controls.clickHandCard(card)}
              >
                {card.name}
              </li>
            );
          })}
        </ul>

        <button
          onClick={controls.drawCard}
          style={{ cursor: queries.canClickDeck() ? "pointer" : "not-allowed" }}
        >
          Draw Card
        </button>
      </div>

      <p>Discard pile ({game.discardPile.length})</p>
      <ul>
        {game.discardPile.map(card => (
          <li
            key={card.instanceId}
            style={{ cursor: queries.canInteractWithDiscardPileCard(card) ? "pointer" : "not-allowed" }}
            onClick={() => controls.clickDiscardPileCard(card)}
          >
            {card.name}
          </li>
        ))}
      </ul>
      <hr />
      <p>Moves left this turn: {queries.getMovesLeft()} / {queries.getMaxMoves()}</p>
      <p>Turn type: {queries.getTurnType()}</p>
      <MessageBanner message={controls.message} onDismiss={controls.dismissMessage} style={{ marginBottom: 8 }} />
      <TurnControls controls={controls} discardLabel="Discard Extra Hand Cards" />
    </div>
  );
}
