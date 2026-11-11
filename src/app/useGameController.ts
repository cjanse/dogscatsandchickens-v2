import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { GameController, type GameResult, type PlayResult } from "../controller/GameController";
import type { CardView, GameView, PlayerView } from "../model/game/views";
import { loadV1Assets } from "./loadV1Assets";

/**
 * The controller's read-only methods. Views get the controller typed down to this, so every action has
 * to go through the hook's wrappers below, which turn a failed `PlayResult` into `message`.
 */
export type GameQueries = Pick<
  GameController,
  | "canClickField"
  | "canClickActivate"
  | "getPairAbility"
  | "canPlayHandCard"
  | "canClickDeck"
  | "canEndTurn"
  | "canInteractWithOpponentCard"
  | "canInteractWithDiscardPileCard"
  | "isCardVisibleToPlayer"
  | "isFaceUp"
  | "getSelectedCard"
  | "getMovesLeft"
  | "getMaxMoves"
  | "getTurnType"
  | "canStartDiscardPhase"
  | "getPendingAction"
>;

export interface GameControls {
  queries: GameQueries;
  /**
   * The same mutable objects on every render: `game`, the players and the cards are changed in place.
   * Don't wrap a component that takes them in `React.memo`, or it will never update.
   */
  game: GameView;
  /**
   * The player whose side of the table the screen shows. Against the AI this is always the human, even
   * while the AI takes its turn. In hot-seat it is whoever's turn it is. Draw the board from this side.
   */
  viewer: PlayerView;
  /** The viewer's opponent. */
  opponent: PlayerView;
  /** False while the AI takes its turn. The action wrappers do nothing then. */
  isMyTurn: boolean;
  result: GameResult;

  /** Why the last action failed, until the next one succeeds or the player dismisses it. */
  message: string | null;
  dismissMessage: () => void;

  /** Show "Discard Extra" instead of "End Turn": the hand is over the limit and the discard phase hasn't started. */
  showDiscardExtra: boolean;
  canFinishTurn: boolean;

  clickField: (owner: PlayerView, row: number, col: number) => void;
  /** Activates the face-down matched pair in `row` of `owner`'s field (the viewer's own, on their turn). */
  activatePair: (owner: PlayerView, row: number) => void;
  clickHandCard: (card: CardView) => void;
  clickOpponentHandCard: (card: CardView) => void;
  /** Returns true when the pick worked, so the view can close the discard list. */
  clickDiscardPileCard: (card: CardView) => boolean;
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
  const viewer = controller.getViewer();
  const opponent = game.players.find(p => p.id !== viewer.id) ?? viewer;
  const isMyTurn = controller.isHumanTurn();

  /** Runs an action only on the viewer's own turn, and keeps its failure reason as `message`. */
  function run(action: () => PlayResult): boolean {
    if (!isMyTurn) return false;
    const result = action();
    setMessage(result.success ? null : result.reason);
    return result.success;
  }

  return {
    queries: controller,
    game,
    viewer,
    opponent,
    isMyTurn,
    result: controller.getGameResult(),
    message,
    dismissMessage: () => setMessage(null),
    showDiscardExtra: controller.canStartDiscardPhase(),
    canFinishTurn: controller.canFinishTurn(),
    clickField: (owner, row, col) => { run(() => controller.clickField(owner, row, col)); },
    activatePair: (owner, row) => { run(() => controller.clickActivate(owner, row)); },
    clickHandCard: card => { run(() => controller.clickHandCard(card)); },
    clickOpponentHandCard: card => { run(() => controller.interactWithOpponentCard(opponent, card)); },
    clickDiscardPileCard: card => run(() => controller.selectDiscardPileCard(card)),
    drawCard: () => { run(() => controller.clickDeck()); },
    startDiscardPhase: () => { run(() => controller.startDiscardPhase()); },
    finishTurn: () => { run(() => controller.finishTurn()); },
  };
}
