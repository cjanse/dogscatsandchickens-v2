import { GameBoard } from "../model/game/GameBoard";
import { Player } from "../model/game/Player";
import { DeckFactory } from "../model/deck/DeckFactory";
import type { CardData } from "../model/types/CardData";
import { Card } from "../model/cards/Card";
import { ActionCard } from "../model/cards/ActionCard";
import type { UpgradeCard } from "../model/cards/UpgradeCard";
import type { CreatureCard } from "../model/cards/CreatureCard";
import type { CreatureType } from "../model/types/CreatureType";
import type { TurnType } from "../model/types/TurnType";
import type { GameResult } from "../model/types/GameResult";
import type { GameView, PlayerView } from "../model/game/views";
import { resolveBattle } from "../model/rules/Battle";
import { activateMatchedAbility, canAttackAgain } from "../model/rules/Matching";
import { canPlaceCreature, canPlaceUpgrade, hasUpgradeSlot } from "../model/rules/Placement";
import { AIController } from "./AIController";

//Types
export type { TurnType, GameResult };

export type PlayResult =
  | { success: true }
  | { success: false; reason: string };

export type PendingAction = "revealHand" | "stealCard" | "powerOfTea" | "actionRevive" | "creatureRevive" | "upgradeRevive" | "attack" | "discardExtraCards" | null;

/** How long the AI "thinks" before it plays its turn, so the human can follow what happened. */
const DEFAULT_AI_TURN_DELAY_MS = 500;

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

    // Initialize the game: shuffle and deal starting hands
    this.initializeGame();
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

  private initializeGame(): void {
    // Shuffle the deck
    this.game.deck.shuffle();

    // Deal 5 cards to each player with minimum 3 creature cards
    for (const player of this.game.players) {
      this.dealStartingHand(player);
    }
  }

  private dealStartingHand(player: Player): void {
    const cardsPerPlayer = 5;
    const minCreatureCards = 3;
    let hand: Card[] = [];
    let creatureCount = 0;

    // Draw cards until we have 5 cards with at least 3 creatures
    while (hand.length < cardsPerPlayer) {
      const card = this.game.deck.draw();
      if (!card) break; // No more cards in deck

      hand.push(card);
      card.facedUp = false;

      if (card.type === "creature") {
        creatureCount++;
      }

      // If we have 5 cards and minimum creatures, we're done
      if (hand.length === cardsPerPlayer && creatureCount >= minCreatureCards) {
        break;
      }

      // If we have 5 cards but not enough creatures, put cards back and try again
      if (hand.length === cardsPerPlayer && creatureCount < minCreatureCards) {
        // Return cards to bottom of deck and reset
        for (let i = hand.length - 1; i >= 0; i--) {
          this.game.deck.putCardBack(hand[i]);
        }
        hand = [];
        creatureCount = 0;
        this.game.deck.shuffle();
      }
    }

    // Add the final hand to the player
    for (const card of hand) {
      player.addToHand(card);
    }
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
   * Calls `listener` whenever the controller changes state on its own (an AI turn, or the end of a
   * turn through `finishTurn`). Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
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
    return player.hand.length > 5;
  }

  startDiscardPhase(): PlayResult {
    if (!this.hasExtraHandCards(this.game.currentPlayer)) {
      return { success: false, reason: "Hand size is within limit" };
    }
    this.pendingAction = "discardExtraCards";
    return { success: true };
  }

  discardHandCard(card: Card): PlayResult {
    if (this.pendingAction !== "discardExtraCards") {
      return { success: false, reason: "Not in discard phase" };
    }

    const removed = this.game.currentPlayer.removeFromHand(card.instanceId);
    if (!removed) {
      return { success: false, reason: "Card not found in hand" };
    }

    this.game.discard(removed);

    // If hand is now 5 or fewer, end discard phase
    if (!this.hasExtraHandCards(this.game.currentPlayer)) {
      this.pendingAction = null;
    }

    return { success: true };
  }

  private playerHasCreatures(player: Player): boolean {
    return player.field.some(row =>
      row.some(card => card?.type === "creature")
    );
  }

  private allCreaturesSameType(): boolean {
    const creatureTypes = new Set<CreatureType>();

    for (const player of this.game.players) {
      for (const row of player.field) {
        for (const card of row) {
          if (card?.type === "creature") {
            creatureTypes.add((card as CreatureCard).creatureType);
          }
        }
      }
    }

    return creatureTypes.size <= 1;
  }

  private playerHasPlayableHand(player: Player): boolean {
    return player.hand.some(card =>
      this.canPlayHandCard(player, card)
    );
  }

  private checkLossCondition(player: Player): boolean {
    if (!this.playerHasCreatures(player)) {
      this.game.endGame({
        state: "loss",
        loserId: player.id
      });
      return true;
    }
    return false;
  }

  private checkTieCondition(): boolean {
    const noCardsToDraw = this.game.deck.size === 0;
    const sameCreatureType = this.allCreaturesSameType();

    const noPlayableHands = this.game.players.every(
      p => !this.playerHasPlayableHand(p)
    );

    if (noCardsToDraw && sameCreatureType && noPlayableHands) {
      this.game.endGame({ state: "tie" });
      return true;
    }

    return false;
  }
  //end game result logic suite

  /** Player actions */
  drawCard(playerView: PlayerView): PlayResult {
    if (!this.canDrawCard(playerView)) {
      return { success: false, reason: "You can't draw a card right now" };
    }
    const player = this.modelPlayer(playerView);
    const card = this.game.deck.draw();
    if (!card) return { success: false, reason: "The deck is empty" };

    card.facedUp = false;
    player.addToHand(card);
    this.game.turn.markDrawn();
    return { success: true };
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
      this.playerHasCreatures(player);
  }

  isFirstTurn(): boolean {
    return this.game.currentPlayer.turnCount === 0;
  }

  /** True while the current player owes a draw. No move or end of turn is allowed until they draw. */
  mustDrawFirst(): boolean {
    return this.canDrawCard(this.game.currentPlayer);
  }

  canEndTurn(): boolean {
    return !this.isGameOver() && !this.mustDrawFirst();
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
  }

  startAttack(row: number, col: number): PlayResult {
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
  }

  resolveAttack(row: number, col: number): PlayResult {
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
  }

  private playCreatureCard(
    player: Player,
    card: CreatureCard,
    row: number,
    col: number
  ): PlayResult {
    const matchedResult = player.playToField(card.instanceId, row, col);
    if (matchedResult) {
      activateMatchedAbility(this.game, player, matchedResult.matchedCard);
    }
    return { success: true };
  }

  private playUpgradeCard(
    player: Player,
    card: UpgradeCard,
    row: number,
    col: number
  ): PlayResult {
    player.playToField(card.instanceId, row, col);
    return { success: true };
  }

  /** Power of Tea: reveals the clicked card on the opponent's field and discards the Tea card. */
  private resolvePowerOfTea(owner: PlayerView, row: number, col: number): PlayResult {
    const tea = this.selectedCard;
    if (!tea || !this.canUsePowerOfTea(owner, row, col)) {
      return { success: false, reason: "Invalid Power of Tea target" };
    }

    // Clear temp effects BEFORE resolving
    this.resetTemporaryEffectsIfNeeded();

    // Reveal opponent's card
    const targetCard = this.modelPlayer(owner).field[row]?.[col];
    if (targetCard) {
      targetCard.facedUp = true;
    }

    // Discard action card
    this.game.discard(this.game.currentPlayer.removeFromHand(tea.instanceId) as Card);
    this.selectedCard = null;
    this.game.turn.useMove();

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

  /** Power of Tea targets a card on the opponent's field while a Tea card is waiting for its target. */
  private canUsePowerOfTea(owner: PlayerView, row: number, col: number): boolean {
    return this.pendingAction === "powerOfTea" &&
      this.selectedCard !== null &&
      this.canPlayHandCard(this.game.currentPlayer, this.selectedCard) &&
      this.game.currentPlayer.id !== owner.id &&
      !!owner.field[row]?.[col];
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
    if (this.isGameOver()) return false;
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
  }

  //Play Hand Card Logic suite
  /**
   * One entry point for a click on a card in the current player's hand: discards it during the
   * discard phase, deselects it if it is already selected, and otherwise selects it.
   */
  clickHandCard(playerView: PlayerView, card: Card): PlayResult {
    if (this.pendingAction === "discardExtraCards") {
      return this.discardHandCard(card);
    }
    if (this.selectedCard === card) {
      this.deselectCard();
      return { success: true };
    }
    return this.selectHandCard(playerView, card);
  }

  /** Drops the current selection, and with it any temporary effect or pending action it started. */
  deselectCard(): void {
    this.resetTemporaryEffectsIfNeeded();
    this.selectedCard = null;
  }

  /**
   * Picks up a card from the player's hand. A creature or upgrade is then placed with `clickField`.
   * An action card starts its pending action and is discarded by the controller when it resolves.
   */
  selectHandCard(playerView: PlayerView, card: Card): PlayResult {
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
  }

  private playHandActionCard(player: Player, card: ActionCard): PlayResult {
    if (this.canPlayHandCard(player, card) === false) {
      return { success: false, reason: "Cannot play this card" };
    }
    switch (card.actionType) {
      case "powerOfTea":
        this.pendingAction = "powerOfTea";
        return { success: true };
      case "messyDorm":
        return this.resolveMessyDorm(player);
      case "birdArmy":
        this.pendingAction = "stealCard";
        return { success: true };
      case "spirit":
        switch (card.id) {
          case "River_Spirits":
            this.pendingAction = "actionRevive";
            return { success: true };
          case "Forest_Spirits":
            this.pendingAction = "creatureRevive";
            return { success: true };
          case "Beach_Spirits":
            this.pendingAction = "upgradeRevive";
            return { success: true };
        }
    }
    return {success: true};
  }

  private resolveMessyDorm(player: Player): PlayResult {
    const opponent = this.game.opponentOf(player);
    // Add temporary effect
    this.game.addTemporaryEffect({
      type: "revealHand",
      sourcePlayerId: player.id,
      targetPlayerId: opponent.id
    });

    this.pendingAction = "revealHand";

    return { success: true };
    }

  //End Play Hand Card Logic

  //Can Play Hand Card Logic suite
  //TODO: ENHANCE CANPLAYHANDCARD FUNCTION
  canPlayHandCard(player: PlayerView, card: Card): boolean {
    const canPlay = this.canMakeMove() && player.id === this.game.currentPlayer.id && player.hand.includes(card);
    if (canPlay === false) return false;
    // First turn: only a creature may be played
    if (this.isFirstTurn() && card.type !== "creature") return false;
    else {
      if (card.type === "upgrade") return hasUpgradeSlot(this.modelPlayer(player));
      else if (card.type === "action") return this.canPlayHandAction(card as ActionCard);
      else return true; //creature can ALWAYS be played
    }
  }

  private canPlayHandAction(card: ActionCard): boolean {
    const opponent = this.game.opponentOf(this.game.currentPlayer);
    switch (card.actionType) {
      case "powerOfTea":
        return opponent.field.flat().some(fieldCard => fieldCard?.facedUp === false);
      case "messyDorm":
        return true;
      case "birdArmy":
        return opponent.hand.length > 0;
      case "spirit":
        switch (card.id) {
          case "River_Spirits":
            return this.game.discardPile.some(card => card.type === "action");
          case "Forest_Spirits":
            return this.game.discardPile.some(card => card.type === "creature");
          case "Beach_Spirits":
            return this.game.discardPile.some(card => card.type === "upgrade");
        }
    }
    return true;
  }

  //End Can Play Hand Card Logic

  //Interact with opponent hand
  /** The selected hand card that started the pending action, if it is still in the current player's hand. */
  private actingCard(): Card | null {
    const card = this.selectedCard;
    return card && this.game.currentPlayer.hand.includes(card) ? card : null;
  }

  interactWithOpponentCard(playerView: PlayerView, card: Card): PlayResult {
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
        // Validate before touching any state so a failed attempt costs nothing
        if (!player.hand.some(c => c.type === card.type)) {
          return { success: false, reason: "No cards of that type to steal" };
        }

        this.resetTemporaryEffectsIfNeeded();
        const result = this.resolveSteal(player, acting, card);
        if (result.success) {
          this.selectedCard = null;
          this.game.turn.useMove();
        }
        return result;
      }
    }
    return {success: false, reason: "No interaction performed"};
  }

  private resolveSteal(player: Player, acting: Card, card: Card): PlayResult {

    // Filter opponent hand by that type
    const candidates = player.hand.filter(
      c => c.type === card.type
    );

    if (candidates.length === 0) {
      return {
        success: false,
        reason: "No cards of that type to steal"
      };
    }

    // Random selection (controller-only)
    const stolen =
      candidates[Math.floor(Math.random() * candidates.length)];

    this.game.currentPlayer.addToHand(player.removeFromHand(stolen.instanceId) as Card);

    // Clear pending state
    this.pendingAction = null;

    this.game.discard(this.game.currentPlayer.removeFromHand(acting.instanceId) as Card);

    return { success: true };
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
        // Remove card from discard pile
        const result = this.resolveRevive(acting, card);
        if (result.success) {
          this.selectedCard = null;
          this.game.turn.useMove();
        }
        return result;
      }
    }
    return {success: false, reason: "No interaction performed"};
  }

  private resolveRevive(acting: Card, card: Card): PlayResult {
    this.game.currentPlayer.addToHand(this.game.takeFromDiscard(card) as Card);
    //Discard action card
    this.game.discard(this.game.currentPlayer.removeFromHand(acting.instanceId) as Card);
    return { success: true };
  }
  //End discard pile Logic suite


  //Can interact with Discard pile Logic suite
  canInteractWithDiscardPileCard(card: Card): boolean {
    if (this.isGameOver()) return false;
    if (!this.game.discardPile.includes(card)) return false;
    switch (card.type) {
      case "creature":
        return this.pendingAction === "creatureRevive";
      case "upgrade":
        return this.pendingAction === "upgradeRevive";
      case "action":
        return this.pendingAction === "actionRevive";
    }
    return false;
  }
  //End can interact with Discard pile Logic suite

  // Visibility Logic
  /** Whether the current player can see `card`, which belongs to `owner` (in their hand or on their field). */
  isCardVisibleToPlayer(card: Card, owner: PlayerView): boolean {
    // Player sees their own cards
    if (owner.id === this.game.currentPlayer.id) {
      return true;
    }

    // permanent visibility
    if (card.facedUp) return true;

    // temporary effects
    const revealEffect = this.game.temporaryEffects.find(
      e =>
        e.type === "revealHand" &&
        e.targetPlayerId === owner.id &&
        e.sourcePlayerId === this.game.currentPlayer.id
    );

    if (revealEffect && owner.hand.includes(card)) {
      return true;
    }

    return false;
  }

  //reset Temporary Effects if needed logic suite
  resetTemporaryEffectsIfNeeded() {
    this.clearRevealIfNeeded(this.game.currentPlayer);
    this.pendingAction = null;
  }

  private clearRevealIfNeeded(player: Player) {
    const revealEffect = this.game.temporaryEffects.find(
      e =>
        e.type === "revealHand" &&
        e.sourcePlayerId === player.id
    );

    if (revealEffect) {
      // Remove the reveal effect
      this.game.removeTemporaryEffect(revealEffect);

      //Pending action is set to null
      this.pendingAction = null;

      // Discard the Reveal card
      const revealCard = player.hand.find(
        c => c.type === "action" && (c as ActionCard).actionType === "messyDorm"
      );
      if (revealCard) {
        this.game.discard(player.removeFromHand(revealCard.instanceId) as Card);
      }

      //Increase move counter
      this.game.turn.useMove();
    }
  }

  // Turn Management
  endTurn(): PlayResult {
    if (this.isGameOver()) {
      return { success: false, reason: "The game is over" };
    }
    if (this.mustDrawFirst()) {
      return { success: false, reason: "You must draw first" };
    }

    // Clear temporary effects first: clearing a Messy Dorm reveal charges a move to
    // this turn, and nextTurn() below then resets the turn state for the next player.
    this.resetTemporaryEffectsIfNeeded();
    this.selectedCard = null;

    // LOSS CHECK
    if (this.checkLossCondition(this.game.currentPlayer)) {
      return { success: true };
    }

    // Counts the finished turn, passes play on, and resets the turn state
    this.game.nextTurn();

    this.checkTieCondition();
    return { success: true };
  }

  /**
   * The End Turn button's entry point. Ends the turn like `endTurn`, then, if the next player is the AI,
   * plays the AI's turn after `aiTurnDelayMs` and keeps going until a human is up or the game ends.
   * Listeners are notified after each step. `endTurn` itself stays synchronous.
   */
  finishTurn(): PlayResult {
    const result = this.endTurn();
    if (result.success) {
      this.scheduleAITurn();
    }
    this.notify();
    return result;
  }

  private scheduleAITurn(): void {
    if (this.aiTimer !== null || this.isGameOver() || !this.game.currentPlayer.isAI) return;

    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      // The state may have changed while we waited
      if (this.isGameOver() || !this.game.currentPlayer.isAI) return;

      this.ai ??= new AIController(this);
      this.ai.executeAITurn();
      const ended = this.endTurn();
      this.notify();
      // If the AI could not end its turn, stop here instead of retrying forever
      if (ended.success) this.scheduleAITurn();
    }, this.aiTurnDelayMs);
  }
}