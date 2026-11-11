import { GameBoard } from "../model/game/GameBoard";
import { Player } from "../model/game/Player";
import { DeckFactory } from "../model/deck/DeckFactory";
import type { CardData } from "../model/types/CardData";
import { Card } from "../model/cards/Card";
import type { ActionCard } from "../model/cards/ActionCard";
import type { UpgradeCard } from "../model/cards/UpgradeCard";
import type { CreatureCard } from "../model/cards/CreatureCard";
import type { TurnType } from "../model/types/TurnType";
import type { GameResult } from "../model/types/GameResult";
import type { CardType } from "../model/types/CardType";
import type { GameView, PlayerView } from "../model/game/views";
import { resolveBattle } from "../model/rules/Battle";
import { activateMatchedAbility, canAttackAgain } from "../model/rules/Matching";
import { setUpGame } from "../model/rules/Setup";
import { lossResult, playerHasCreatures, tieResult } from "../model/rules/GameEnd";
import { HAND_LIMIT, isOverHandLimit } from "../model/rules/HandLimit";
import { canPlaceCreature, canPlaceUpgrade } from "../model/rules/Placement";
import {
  canRevealWithTea,
  canRevive,
  endHandReveal,
  isPlayableCard,
  revealWithTea,
  revive,
  reviveKind,
  startHandReveal,
  stealRandomCard,
} from "../model/rules/Actions";
import { isCardVisible } from "../model/rules/Visibility";
import { AIController } from "./AIController";

//Types
export type { TurnType, GameResult };

export type PlayResult =
  | { success: true }
  | { success: false; reason: string };

export type PendingAction = "revealHand" | "stealCard" | "powerOfTea" | "actionRevive" | "creatureRevive" | "upgradeRevive" | "attack" | "discardExtraCards" | null;

/** The pending action a Spirit starts, by the kind of card it takes from the discard pile. */
const REVIVE_ACTIONS: Record<CardType, PendingAction> = {
  creature: "creatureRevive",
  upgrade: "upgradeRevive",
  action: "actionRevive",
};

function isRevivePending(action: PendingAction): boolean {
  return action === "creatureRevive" || action === "upgradeRevive" || action === "actionRevive";
}

/** How long the AI "thinks" before it plays its turn, so the human can follow what happened. */
const DEFAULT_AI_TURN_DELAY_MS = 500;

/** What the click-level entry points return while the AI is taking its turn. */
const AI_TURN_REFUSAL: PlayResult = { success: false, reason: "Wait for the AI to finish its turn" };

export class GameController {
  private game: GameBoard;
  private pendingAction: PendingAction = null;
  /**
   * The hand card the current player has picked up this turn. For an action card it is also the card
   * behind `pendingAction`: the controller discards it itself once the action resolves, so the UI
   * never has to hand an id back.
   */
  private selectedCard: Card | null = null;

  private listeners = new Set<() => void>();
  private version = 0;
  private notifyDepth = 0;
  private ai: AIController | null = null;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;
  /** Pause before each AI turn. Tests set this to 0 or use fake timers. */
  aiTurnDelayMs = DEFAULT_AI_TURN_DELAY_MS;

  constructor(
    cardDefs: Record<string, CardData>,
    deckConfig: Record<string, number>,
    player2IsAI = false
  ) {
    const deck = DeckFactory.create(deckConfig, cardDefs);

    const player1 = new Player(0, 0, 4, false);
    const player2 = new Player(1, 0, 4, player2IsAI);

    this.game = new GameBoard([player1, player2], deck);

    setUpGame(this.game);
  }

  /**
   * Wraps an already-built GameBoard without shuffling or dealing.
   * Intended for tests that need an exact starting state.
   */
  static fromBoard(board: GameBoard): GameController {
    const controller = new GameController({}, {});
    controller.game = board;
    return controller;
  }

  /** Read-only access for the UI. Every change goes through this controller. */
  getGameState(): GameView {
    return this.game;
  }

  /** Finds the real Player behind a read-only view the UI is holding. */
  private modelPlayer(view: PlayerView): Player {
    const player = this.game.players.find(p => p.id === view.id);
    if (!player) throw new Error(`Unknown player ${view.id}`);
    return player;
  }

  getPendingAction(): PendingAction {
    return this.pendingAction;
  }

  /**
   * The card the UI should highlight: the attacker while an attack is pending, otherwise the
   * hand card the player has picked up.
   */
  getSelectedCard(): Card | null {
    if (this.pendingAction === "attack") {
      return this.game.turn.attackingCard?.card ?? null;
    }
    return this.selectedCard;
  }

  /**
   * Calls `listener` after every public method that can change state (a human action, the end of a
   * turn, or a whole AI turn), whether or not the action succeeded. Nested calls notify once.
   * Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Goes up by one with every notification. `getGameState()` always returns the same mutable object,
   * so this number is what tells a view (through `useSyncExternalStore`) that something changed.
   */
  getVersion(): number {
    return this.version;
  }

  private notify(): void {
    this.version++;
    this.listeners.forEach(listener => listener());
  }

  /** Runs `fn`, then notifies once. Calls nested inside `fn` (clickField → playCard) don't notify on their own. */
  private withNotify<T>(fn: () => T): T {
    this.notifyDepth++;
    try {
      return fn();
    } finally {
      this.notifyDepth--;
      if (this.notifyDepth === 0) this.notify();
    }
  }

  /** Cancels a pending AI turn. Call it when the view goes away. The controller stays usable. */
  dispose(): void {
    if (this.aiTimer !== null) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  // Move logic
  getMovesLeft(): number {
    return this.game.movesLeft;
  }

  getMaxMoves(): number {
    return this.game.maxMovesPerTurn;
  }

  //turn type logic
  getTurnType(): TurnType {
    return this.game.turn.turnType;
  }

  //game result logic suite
  getGameResult(): GameResult {
    return this.game.result;
  }

  isGameOver(): boolean {
    return this.game.isGameOver;
  }

  hasExtraHandCards(player: PlayerView): boolean {
    return isOverHandLimit(player);
  }

  /** Whether "Discard Extra" is available: the current player is a human over the hand limit and hasn't started discarding. */
  canStartDiscardPhase(): boolean {
    return !this.isGameOver() &&
      this.isHumanTurn() &&
      this.hasExtraHandCards(this.game.currentPlayer) &&
      this.pendingAction !== "discardExtraCards";
  }

  startDiscardPhase(): PlayResult {
    return this.withNotify(() => {
      if (!this.hasExtraHandCards(this.game.currentPlayer)) {
        return { success: false, reason: "Hand size is within limit" };
      }
      this.pendingAction = "discardExtraCards";
      return { success: true };
    });
  }

  discardHandCard(card: Card): PlayResult {
    return this.withNotify(() => {
      if (this.pendingAction !== "discardExtraCards") {
        return { success: false, reason: "Not in discard phase" };
      }

      const removed = this.game.currentPlayer.removeFromHand(card.instanceId);
      if (!removed) {
        return { success: false, reason: "Card not found in hand" };
      }

      this.game.discard(removed);

      // Once the hand is back within the limit, the discard phase is over
      if (!this.hasExtraHandCards(this.game.currentPlayer)) {
        this.pendingAction = null;
      }

      return { success: true };
    });
  }

  /** Player actions */
  drawCard(playerView: PlayerView): PlayResult {
    return this.withNotify(() => {
      if (!this.canDrawCard(playerView)) {
        return { success: false, reason: "You can't draw a card right now" };
      }
      const player = this.modelPlayer(playerView);
      const card = this.game.deck.draw();
      if (!card) return { success: false, reason: "The deck is empty" };

      player.addToHand(card);
      this.game.turn.markDrawn();
      return { success: true };
    });
  }

  /**
   * A draw costs no move. It isn't available on a first turn, with an empty deck,
   * or (during a recovery turn) until the player has a creature on the field.
   */
  canDrawCard(playerView: PlayerView): boolean {
    if (this.isGameOver()) return false;
    const player = this.modelPlayer(playerView);
    return !this.game.turn.hasDrawn &&
      player === this.game.currentPlayer &&
      this.game.deck.size > 0 &&
      player.turnCount !== 0 &&
      playerHasCreatures(player);
  }

  isFirstTurn(): boolean {
    return this.game.currentPlayer.turnCount === 0;
  }

  /** True while the current player owes a draw. No move or end of turn is allowed until they draw. */
  mustDrawFirst(): boolean {
    return this.canDrawCard(this.game.currentPlayer);
  }

  canEndTurn(): boolean {
    return !this.isGameOver() &&
      !this.mustDrawFirst() &&
      !this.hasExtraHandCards(this.game.currentPlayer);
  }

  /** Whether the End Turn button works: the turn can end and it belongs to a human (the AI ends its own). */
  canFinishTurn(): boolean {
    return this.canEndTurn() && this.isHumanTurn();
  }

  private canMakeMove(): boolean {
    return !this.isGameOver() && !this.mustDrawFirst() && this.game.movesLeft > 0;
  }

  // Play card logic suite for field (REINFORCE ONLY: creatures and upgrades)
  /**
   * Places a creature or upgrade from the current player's hand. `player` owns the field being
   * placed on. Action cards are resolved through `selectHandCard`, `clickField` and friends.
   */
  playCard(playerView: PlayerView, card: Card, row: number, col: number): PlayResult {
    return this.withNotify(() => {
      if (!this.canPlayCard(playerView, card, row, col)) {
        return { success: false, reason: "Invalid card placement" };
      }

      const player = this.modelPlayer(playerView);

      // Clear temp effects BEFORE resolving
      this.resetTemporaryEffectsIfNeeded();

      let result: PlayResult;

      switch (card.type) {
        case "creature":
          result = this.playCreatureCard(player, card as CreatureCard, row, col);
          break;

        case "upgrade":
          result = this.playUpgradeCard(player, card as UpgradeCard, row, col);
          break;

        default:
          return { success: false, reason: "Only creatures and upgrades are placed on the field" };
      }

      if (result.success) {
        this.game.turn.useMove();
        if (this.selectedCard === card) this.selectedCard = null;
      }

      return result;
    });
  }

  startAttack(row: number, col: number): PlayResult {
    return this.withNotify(() => {
      const card = this.game.currentPlayer.field[row]?.[col];

      if (!card || card.type !== "creature") {
        return { success: false, reason: "No creature to attack with" };
      }

      const creature = card as CreatureCard;

      if (this.isGameOver()) {
        return { success: false, reason: "The game is over" };
      }
      if (this.mustDrawFirst()) {
        return { success: false, reason: "You must draw first" };
      }
      if (this.isFirstTurn()) {
        return { success: false, reason: "Only a creature may be played on your first turn" };
      }
      // Check if this is first attack or if the attacking creature is a matched cat (can attack multiple times)
      if (!this.canAttackWith(row, col)) {
        return { success: false, reason: "Attacks must be first move" };
      }

      this.game.turn.beginAttack({
        card: creature,
        row,
        col
      });

      this.pendingAction = "attack";

      return { success: true };
    });
  }

  resolveAttack(row: number, col: number): PlayResult {
    return this.withNotify(() => {
      const turn = this.game.turn;
      const attacking = turn.attackingCard;
      if (!attacking) {
        return { success: false, reason: "No attack started" };
      }

      const opponent = this.game.opponentOf(this.game.currentPlayer);
      const defender = opponent.field[row]?.[col];

      if (!defender || defender.type !== "creature") {
        return { success: false, reason: "Invalid attack target" };
      }

      resolveBattle(
        this.game,
        { player: this.game.currentPlayer, row: attacking.row, card: attacking.card },
        { player: opponent, row, card: defender as CreatureCard }
      );

      // cleanup. Read this after the battle: a defeated attacker has been reset (no longer matched).
      const canAttackAgainThisTurn = canAttackAgain(attacking.card);
      this.pendingAction = null;

      // Always consume the turn
      turn.useAllMoves(this.game.maxMovesPerTurn);

      // A matched Cat may attack again. turnType stays "attack" so the player can click the cat again.
      turn.finishAttack(canAttackAgainThisTurn);

      return { success: true };
    });
  }

  private playCreatureCard(
    player: Player,
    card: CreatureCard,
    row: number,
    col: number
  ): PlayResult {
    const placed = player.playToField(card.instanceId, row, col);
    if (!placed.placed) return { success: false, reason: "Invalid card placement" };
    if (placed.match) {
      activateMatchedAbility(this.game, player, placed.match.card);
    }
    return { success: true };
  }

  private playUpgradeCard(
    player: Player,
    card: UpgradeCard,
    row: number,
    col: number
  ): PlayResult {
    const placed = player.playToField(card.instanceId, row, col);
    return placed.placed ? { success: true } : { success: false, reason: "Invalid card placement" };
  }

  /** Power of Tea: reveals the clicked card on the opponent's field and discards the Tea card. */
  private resolvePowerOfTea(owner: PlayerView, row: number, col: number): PlayResult {
    const tea = this.actingCard();
    if (!tea || !this.canUsePowerOfTea(owner, row, col)) {
      return { success: false, reason: "Invalid Power of Tea target" };
    }

    // Clear temp effects BEFORE resolving
    this.resetTemporaryEffectsIfNeeded();
    revealWithTea(this.modelPlayer(owner), row, col);
    this.completeAction(tea.instanceId);
    return { success: true };
  }
  //End Play card logic suite

  // Begin can Play Card Validation Suite
  /** Reinforce only: can this creature or upgrade go on `player`'s field at (row, col)? */
  canPlayCard(playerView: PlayerView, card: Card, row: number, col: number): boolean {
    if (this.isGameOver()) return false;
    const player = this.modelPlayer(playerView);
    const current = this.game.currentPlayer;

    // The card must come from the current player's hand
    if (!current.hand.includes(card)) return false;
    // Moves left, draw-first and first-turn rules
    if (!this.canPlayHandCard(current, card)) return false;

    switch (card.type) {
      case "creature":
        return player === current && canPlaceCreature(player, card, row, col);
      case "upgrade":
        return player === current && canPlaceUpgrade(player, row, col);
    }

    return false;
  }

  /** Power of Tea targets a face-down card on the opponent's field while a Tea card is waiting for its target. */
  private canUsePowerOfTea(owner: PlayerView, row: number, col: number): boolean {
    return this.pendingAction === "powerOfTea" &&
      this.selectedCard !== null &&
      this.canPlayHandCard(this.game.currentPlayer, this.selectedCard) &&
      this.game.currentPlayer.id !== owner.id &&
      canRevealWithTea(owner, row, col);
  }

  canAttackWith(row: number, col: number): boolean {
    const player = this.game.currentPlayer;
    const creature = player.field[row]?.[col] as CreatureCard;
    
    if (!creature || creature.type !== "creature") {
      return false;
    }

    if (this.isGameOver() || this.mustDrawFirst() || this.isFirstTurn()) {
      return false;
    }

    // Allow first attack (no moves used yet) or matched cat extra attack
    const turn = this.game.turn;
    return turn.movesThisTurn === 0 || (turn.allowExtraAttack && canAttackAgain(creature));
  }

  isValidAttackTarget(row: number, col: number): boolean {
    const target = this.game.opponentOf(this.game.currentPlayer).field[row]?.[col];
    return !!target && target.type === "creature";
  }

  // End Play Card Validation Suite

  // Click routing for the UI: what a click on a field cell means right now
  /**
   * Whether clicking (row, col) on `owner`'s field does something. The views use it to highlight cells.
   * Mirrors `clickField`.
   */
  canClickField(owner: PlayerView, row: number, col: number): boolean {
    if (this.isGameOver() || !this.isHumanTurn()) return false;
    const current = this.game.currentPlayer;

    // An attack is waiting for its target: only the opponent's creatures can be clicked
    if (this.pendingAction === "attack") {
      return owner.id !== current.id && owner.field[row]?.[col]?.type === "creature";
    }

    // A Power of Tea card is waiting for its target
    if (this.pendingAction === "powerOfTea") {
      return this.canUsePowerOfTea(owner, row, col);
    }

    // Nothing selected: the only thing a click can do is start an attack
    if (this.selectedCard === null) {
      return this.pendingAction === null && owner.id === current.id && this.canAttackWith(row, col);
    }

    // A creature or upgrade is selected: place it
    return this.canPlayCard(owner, this.selectedCard, row, col);
  }

  /**
   * One entry point for a click on a field cell. Depending on the state it resolves an attack, starts an
   * attack (the first move of a turn, or a matched Cat attacking again), resolves Power of Tea,
   * or places the selected card. Does nothing, and returns a failure, if `canClickField` is false.
   */
  clickField(owner: PlayerView, row: number, col: number): PlayResult {
    return this.withNotify(() => {
      if (!this.isHumanTurn()) return AI_TURN_REFUSAL;
      if (!this.canClickField(owner, row, col)) {
        return { success: false, reason: "Nothing to do here" };
      }

      if (this.pendingAction === "attack") {
        return this.resolveAttack(row, col);
      }

      if (this.pendingAction === "powerOfTea") {
        return this.resolvePowerOfTea(owner, row, col);
      }

      const card = this.selectedCard;
      if (card === null) {
        return this.startAttack(row, col);
      }

      const result = this.playCard(owner, card, row, col);
      // The attempt is over whether it worked or not
      this.selectedCard = null;
      return result;
    });
  }

  //Play Hand Card Logic suite
  /**
   * One entry point for a click on a card in the current player's hand: discards it during the
   * discard phase, deselects it if it is already selected, and otherwise selects it.
   */
  clickHandCard(playerView: PlayerView, card: Card): PlayResult {
    return this.withNotify(() => {
      if (!this.isHumanTurn()) return AI_TURN_REFUSAL;
      if (this.pendingAction === "discardExtraCards") {
        return this.discardHandCard(card);
      }
      if (this.selectedCard === card) {
        this.deselectCard();
        return { success: true };
      }
      return this.selectHandCard(playerView, card);
    });
  }

  /** Drops the current selection, and with it any temporary effect or pending action it started. */
  deselectCard(): void {
    return this.withNotify(() => {
      this.resetTemporaryEffectsIfNeeded();
      this.selectedCard = null;
    });
  }

  /**
   * Picks up a card from the player's hand. A creature or upgrade is then placed with `clickField`.
   * An action card starts its pending action and is discarded by the controller when it resolves.
   */
  selectHandCard(playerView: PlayerView, card: Card): PlayResult {
    return this.withNotify(() => {
      const player = this.modelPlayer(playerView);
      if (!this.canPlayHandCard(player, card)) {
        return { success: false, reason: "Cannot play this card" };
      }
      this.resetTemporaryEffectsIfNeeded();

      let result: PlayResult;
      switch (card.type) {
        case "creature":
        case "upgrade":
          result = { success: true };
          break;
        case "action":
          result = this.playHandActionCard(player, card as ActionCard);
          break;
        default:
          result = { success: false, reason: "Unknown card type" };
      }

      if (result.success) {
        this.selectedCard = card;
      }
      return result;
    });
  }

  /**
   * Starts the action behind a selected action card. Messy Dorm takes effect at once and is charged
   * when the reveal ends (see clearRevealIfNeeded). The others wait for a target: clickField for
   * Power of Tea, interactWithOpponentCard for Bird Army, selectDiscardPileCard for the Spirits.
   */
  private playHandActionCard(player: Player, card: ActionCard): PlayResult {
    switch (card.actionType) {
      case "powerOfTea":
        this.pendingAction = "powerOfTea";
        return { success: true };
      case "messyDorm":
        startHandReveal(this.game, player, card);
        this.pendingAction = "revealHand";
        return { success: true };
      case "birdArmy":
        this.pendingAction = "stealCard";
        return { success: true };
      case "spirit": {
        const kind = reviveKind(card);
        if (kind === null) return { success: false, reason: "Unknown Spirit card" };
        this.pendingAction = REVIVE_ACTIONS[kind];
        return { success: true };
      }
    }
  }

  //End Play Hand Card Logic

  //Can Play Hand Card Logic suite
  /**
   * Whether the current player can play this hand card now. The turn rules (moves left, draw first,
   * first turn) are checked here; what the card itself needs comes from the model's isPlayableCard.
   */
  canPlayHandCard(player: PlayerView, card: Card): boolean {
    if (!this.canMakeMove() || player.id !== this.game.currentPlayer.id || !player.hand.includes(card)) return false;
    // First turn: only a creature may be played
    if (this.isFirstTurn() && card.type !== "creature") return false;
    return isPlayableCard(this.game, player, card);
  }

  //End Can Play Hand Card Logic

  //Interact with opponent hand
  /** The selected hand card that started the pending action, if it is still in the current player's hand. */
  private actingCard(): Card | null {
    const card = this.selectedCard;
    return card && this.game.currentPlayer.hand.includes(card) ? card : null;
  }

  interactWithOpponentCard(playerView: PlayerView, card: Card): PlayResult {
    return this.withNotify(() => {
      if (!this.isHumanTurn()) return AI_TURN_REFUSAL;
      const player = this.modelPlayer(playerView);
      if (!this.canInteractWithOpponentCard(player)) {
        return { success: false, reason: "Cannot interact with this card" };
      }
      const acting = this.actingCard();
      if (!acting) {
        return { success: false, reason: "No card selected" };
      }
      if (!player.hand.includes(card)) {
        return { success: false, reason: "That card is not in the opponent's hand" };
      }

      switch (this.pendingAction) {
        case "stealCard": {
          // The clicked card picks the kind. It is in the opponent's hand (checked above), so a card
          // of that kind is always there to steal.
          this.resetTemporaryEffectsIfNeeded();
          stealRandomCard(this.game.currentPlayer, player, card.type);
          this.completeAction(acting.instanceId);
          return { success: true };
        }
      }
      return {success: false, reason: "No interaction performed"};
    });
  }
  //End interact with opponent hand

  //can interact with Opponent Card Logic suite
  canInteractWithOpponentCard(player: PlayerView): boolean {
    if (this.isGameOver()) return false;
    if (player.id === this.game.currentPlayer.id) return false;
    return this.pendingAction === "stealCard";
  }
  // End can interact with opponent card logic suite

  //Interact with Discard pile Logic suite
  /** Always acts for the current player: the revived card goes to their hand. */
  selectDiscardPileCard(card: Card): PlayResult {
    return this.withNotify(() => {
      if (!this.isHumanTurn()) return AI_TURN_REFUSAL;
      const acting = this.actingCard();
      if (!acting) {
        return { success: false, reason: "No card selected" };
      }
      if (!this.canInteractWithDiscardPileCard(card)) {
        return { success: false, reason: "Cannot interact with this card" };
      }

      switch (this.pendingAction) {
        case "actionRevive":
        case "creatureRevive":
        case "upgradeRevive": {
          this.resetTemporaryEffectsIfNeeded();
          revive(this.game, this.game.currentPlayer, card);
          this.completeAction(acting.instanceId);
          return { success: true };
        }
      }
      return {success: false, reason: "No interaction performed"};
    });
  }
  //End discard pile Logic suite


  //Can interact with Discard pile Logic suite
  canInteractWithDiscardPileCard(card: Card): boolean {
    if (this.isGameOver()) return false;
    if (!this.game.discardPile.includes(card)) return false;
    if (!isRevivePending(this.pendingAction)) return false;
    const acting = this.actingCard();
    return !!acting && canRevive(acting, card);
  }
  //End can interact with Discard pile Logic suite

  // Visibility Logic
  /**
   * The player whose side of the table the screen shows. Against the AI it is always the human, even
   * during the AI's turn, so the AI's hand never shows face up. In hot-seat it is the current player.
   */
  getViewer(): PlayerView {
    return this.viewer();
  }

  private viewer(): Player {
    const current = this.game.currentPlayer;
    if (!current.isAI) return current;
    return this.game.players.find(p => !p.isAI) ?? current;
  }

  /** False while the AI is taking its turn. Every click-level entry point refuses then. */
  isHumanTurn(): boolean {
    return !this.game.currentPlayer.isAI;
  }

  /** Whether the viewer (`getViewer()`) can see `card`, which belongs to `owner` (in their hand or on their field). */
  isCardVisibleToPlayer(card: Card, owner: PlayerView): boolean {
    return isCardVisible(this.game, card, owner, this.viewer());
  }

  /**
   * Whether `card` is permanently face up on the field. Views use it to dim their own face-down cards.
   * To decide whether to show a card's front at all, use `isCardVisibleToPlayer`.
   */
  isFaceUp(card: Card): boolean {
    return card.facedUp;
  }

  //reset Temporary Effects if needed logic suite
  private resetTemporaryEffectsIfNeeded() {
    this.clearRevealIfNeeded();
    // An attack that was started but not resolved is dropped, in the turn state too
    if (this.pendingAction === "attack") this.game.turn.cancelAttack();
    this.pendingAction = null;
  }

  /** Ends a Messy Dorm reveal the current player started: the Dorm that was played is discarded and its move charged now. */
  private clearRevealIfNeeded() {
    const effect = endHandReveal(this.game, this.game.currentPlayer);
    if (effect) this.completeAction(effect.cardInstanceId);
  }

  /**
   * An action card has resolved: discard it from the current player's hand, drop the selection and the
   * pending action, and charge the move. Every action ends here, so the order is the same for all of them.
   */
  private completeAction(actingInstanceId: string): void {
    const acting = this.game.currentPlayer.removeFromHand(actingInstanceId);
    if (acting) this.game.discard(acting);
    if (this.selectedCard?.instanceId === actingInstanceId) this.selectedCard = null;
    this.pendingAction = null;
    this.game.turn.useMove();
  }

  // Turn Management
  endTurn(): PlayResult {
    return this.withNotify(() => {
      if (this.isGameOver()) {
        return { success: false, reason: "The game is over" };
      }
      if (this.mustDrawFirst()) {
        return { success: false, reason: "You must draw first" };
      }
      if (this.hasExtraHandCards(this.game.currentPlayer)) {
        return { success: false, reason: `Discard down to ${HAND_LIMIT} cards first` };
      }

      // Clear temporary effects first: clearing a Messy Dorm reveal charges a move to
      // this turn, and nextTurn() below then resets the turn state for the next player.
      this.resetTemporaryEffectsIfNeeded();
      this.selectedCard = null;

      const loss = lossResult(this.game.currentPlayer);
      if (loss.state !== "ongoing") {
        this.game.endGame(loss);
        return { success: true };
      }

      // Counts the finished turn, passes play on, and resets the turn state
      this.game.nextTurn();

      const tie = tieResult(this.game);
      if (tie.state !== "ongoing") this.game.endGame(tie);
      return { success: true };
    });
  }

  /**
   * The End Turn button's entry point. Ends the turn like `endTurn`, then, if the next player is the AI,
   * plays the AI's turn after `aiTurnDelayMs` and keeps going until a human is up or the game ends.
   * Listeners are notified after the turn ends and after each AI turn. `endTurn` itself stays synchronous.
   */
  finishTurn(): PlayResult {
    return this.withNotify(() => {
      // The AI ends its own turns. Without this, a click while it "thinks" would end its turn for it.
      if (!this.isHumanTurn()) return AI_TURN_REFUSAL;
      const result = this.endTurn();
      if (result.success) {
        this.scheduleAITurn();
      }
      return result;
    });
  }

  private scheduleAITurn(): void {
    if (this.aiTimer !== null || this.isGameOver() || !this.game.currentPlayer.isAI) return;

    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      // The state may have changed while we waited
      if (this.isGameOver() || !this.game.currentPlayer.isAI) return;

      // One notification for the whole AI turn, not one per move
      const ended = this.withNotify(() => {
        this.ai ??= new AIController(this);
        this.ai.executeAITurn();
        return this.endTurn();
      });
      // If the AI could not end its turn, stop here instead of retrying forever
      if (ended.success) this.scheduleAITurn();
    }, this.aiTurnDelayMs);
  }
}