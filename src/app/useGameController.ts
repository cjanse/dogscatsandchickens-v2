import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { GameController, type GameResult, type PlayResult } from "../controller/GameController";
import type { Card } from "../model/cards/Card";
import type { GameView, PlayerView } from "../model/game/views";
import { loadV1Assets } from "./loadV1Assets";

/**
 * The controller's read-only methods. Views get the controller typed down to this, so every action has
 * to go through the hook's wrappers below, which turn a failed `PlayResult` into `message`.
 */
export type GameQueries = Pick<
  GameController,
  | "canClickField"
  | "canPlayHandCard"
  | "canDrawCard"
  | "canEndTurn"
  | "canInteractWithOpponentCard"
  | "canInteractWithDiscardPileCard"
  | "isCardVisibleToPlayer"
  | "isFaceUp"
  | "getSelectedCard"
  | "getMovesLeft"
  | "getMaxMoves"
  | "getTurnType"
  | "hasExtraHandCards"
  | "getPendingAction"
>;

export interface GameControls {
  queries: GameQueries;
  /**
   * The same mutable objects on every render: `game`, the players and the cards are changed in place.
   * Don't wrap a component that takes them in `React.memo`, or it will never update.
   */
  game: GameView;
  currentPlayer: PlayerView;
  opponent: PlayerView;
  result: GameResult;

  /** Why the last action failed, until the next one succeeds or the player dismisses it. */
  message: string | null;
  dismissMessage: () => void;

  /** Show "Discard Extra" instead of "End Turn": the hand is over the limit and the discard phase hasn't started. */
  showDiscardExtra: boolean;
  canFinishTurn: boolean;

  clickField: (owner: PlayerView, row: number, col: number) => void;
  clickHandCard: (card: Card) => void;
  clickOpponentHandCard: (card: Card) => void;
  /** Returns true when the pick worked, so the view can close the discard list. */
  clickDiscardPileCard: (card: Card) => boolean;
  drawCard: () => void;
  startDiscardPhase: () => void;
  finishTurn: () => void;
}

/**
 * Creates a v1 game for the life of the component, re-renders it whenever the controller changes
 * (including the AI's turns), and exposes the actions a view can take.
 */
export function useGameController({ player2IsAI = true }: { player2IsAI?: boolean } = {}): GameControls {
  const [controller] = useState(() => {
    const { cardDefs, deckConfig } = loadV1Assets();
    return new GameController(cardDefs, deckConfig, player2IsAI);
  });
  const [message, setMessage] = useState<string | null>(null);

  // Class methods lose `this` when passed on their own, so wrap them
  const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);
  const getVersion = useCallback(() => controller.getVersion(), [controller]);
  useSyncExternalStore(subscribe, getVersion);

  // Cancel a pending AI turn when the view goes away
  useEffect(() => () => controller.dispose(), [controller]);

  const game = controller.getGameState();
  const currentPlayer = game.players[game.currentPlayerIndex];
  const opponent = game.players[game.currentPlayerIndex === 0 ? 1 : 0];

  function run(result: PlayResult): boolean {
    setMessage(result.success ? null : result.reason);
    return result.success;
  }

  const hasExtraHandCards = controller.hasExtraHandCards(currentPlayer);

  return {
    queries: controller,
    game,
    currentPlayer,
    opponent,
    result: controller.getGameResult(),
    message,
    dismissMessage: () => setMessage(null),
    showDiscardExtra: hasExtraHandCards && controller.getPendingAction() !== "discardExtraCards",
    canFinishTurn: !hasExtraHandCards && controller.canEndTurn(),
    clickField: (owner, row, col) => { run(controller.clickField(owner, row, col)); },
    clickHandCard: card => { run(controller.clickHandCard(currentPlayer, card)); },
    clickOpponentHandCard: card => { run(controller.interactWithOpponentCard(opponent, card)); },
    clickDiscardPileCard: card => run(controller.selectDiscardPileCard(card)),
    drawCard: () => { run(controller.drawCard(currentPlayer)); },
    startDiscardPhase: () => { run(controller.startDiscardPhase()); },
    finishTurn: () => { run(controller.finishTurn()); },
  };
}
