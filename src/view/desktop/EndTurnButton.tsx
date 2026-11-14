import type { GameControls } from "../../app/useGameController";

/**
 * The rail's big button. Same branches as the shared TurnControls, in the same order:
 * greyed out during the AI's turn, "Discard Extra" while the hand is over the limit and the discard
 * phase hasn't started, otherwise "End Turn" (disabled until the turn can end, which also covers the
 * discard phase itself and "draw first").
 */
export function EndTurnButton({ controls }: { controls: GameControls }) {
  if (!controls.isMyTurn) {
    return (
      <button type="button" className="gpd-end-turn" disabled>
        End Turn
      </button>
    );
  }

  if (controls.showDiscardExtra) {
    return (
      <button type="button" className="gpd-end-turn" onClick={controls.startDiscardPhase}>
        Discard Extra
        <span className="gpd-end-turn-sub">
          Hand {controls.viewer.hand.length} of {controls.queries.getHandLimit()}
        </span>
      </button>
    );
  }

  return (
    // The controller also plays the AI's turns, and the hook re-renders as they happen
    <button type="button" className="gpd-end-turn" onClick={controls.finishTurn} disabled={!controls.canFinishTurn}>
      End Turn
    </button>
  );
}
