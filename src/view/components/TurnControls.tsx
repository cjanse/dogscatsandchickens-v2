import type { CSSProperties } from "react";
import type { GameControls } from "../../app/useGameController";

/** "AI is thinking…" during the AI's turn, "Discard Extra" while the hand is over the limit, otherwise "End Turn". */
export function TurnControls({ controls, buttonStyle, discardLabel = "Discard Extra Cards" }: {
  controls: GameControls;
  buttonStyle?: CSSProperties;
  discardLabel?: string;
}) {
  if (!controls.isMyTurn) {
    return <span style={{ ...buttonStyle, fontStyle: "italic" }}>AI is thinking…</span>;
  }

  if (controls.showDiscardExtra) {
    return (
      <button onClick={controls.startDiscardPhase} style={buttonStyle}>
        {discardLabel}
      </button>
    );
  }

  return (
    // The controller also plays the AI's turns, and the hook re-renders as they happen
    <button onClick={controls.finishTurn} disabled={!controls.canFinishTurn} style={buttonStyle}>
      End Turn
    </button>
  );
}
