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
import { resolveBattle } from "../model/rules/Battle";
import { activateMatchedAbility, canAttackAgain } from "../model/rules/Matching";
import { canPlaceCreature, canPlaceUpgrade, hasUpgradeSlot } from "../model/rules/Placement";

//Types
export type { TurnType, GameResult };

export type PlayResult =
  | { success: true }
  | { success: false; reason: string };

export type PendingAction = "revealHand" | "stealCard" | "powerOfTea" | "actionRevive" | "creatureRevive" | "upgradeRevive" | "attack" | "discardExtraCards" | null;

export class GameController {
  private game: GameBoard;
  private pendingAction: PendingAction = null

  constructor(
    cardDefs: Record<string, CardData>,
    deckConfig: Record<string, number>,
    player2IsAI = false
  ) {
    const deck = DeckFactory.create(deckConfig, cardDefs);

    const player1 = new Player(0, 1, 4, false);
    const player2 = new Player(1, 1, 4, player2IsAI);

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

  /** Read-only access for the UI */
  getGameState(): GameBoard {
    return this.game;
  }

  getPendingAction(): PendingAction {
    return this.pendingAction;
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

  hasExtraHandCards(player: Player): boolean {
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
  drawCard(playerIndex: number) {
    if (!this.canDrawCard(playerIndex)) return;
    const player = this.game.players[playerIndex];
    const card = this.game.deck.draw();
    if (!card) return;

    card.facedUp = false;
    player.addToHand(card);
    this.game.turn.markDrawn();
  }

  /**
   * A draw costs no move. It isn't available on a first turn, with an empty deck,
   * or (during a recovery turn) until the player has a creature on the field.
   */
  canDrawCard(playerIndex: number): boolean {
    if (this.isGameOver()) return false;
    const player = this.game.players[playerIndex];
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
    return this.canDrawCard(this.game.currentPlayerIndex);
  }

  canEndTurn(): boolean {
    return !this.isGameOver() && !this.mustDrawFirst();
  }

  private canMakeMove(): boolean {
    return !this.isGameOver() && !this.mustDrawFirst() && this.game.movesLeft > 0;
  }

  // Play card logic suite for field (REINFORCE ONLY)
playCard(
  playerIndex: number,
  cardInstanceId: string,
  row: number,
  col: number
): PlayResult {
  if (!this.canPlayCard(playerIndex, cardInstanceId, row, col)) {
    return { success: false, reason: "Invalid card placement" };
  }

  const player = this.game.players[playerIndex];

  // Card must come from current player's hand
  const card = this.game.currentPlayer.hand.find(
    c => c.instanceId === cardInstanceId
  );

  if (!card) {
    return { success: false, reason: "Card not found in hand" };
  }

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

    case "action":
      result = this.playActionCard(card as ActionCard, row, col);
      break;

    default:
      return { success: false, reason: "Unknown card type" };
  }

  if (result.success) {
    this.game.turn.useMove();
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

  private playActionCard(card: ActionCard, row: number, col: number): PlayResult {
    switch (card.actionType) {
      case "powerOfTea":
        return this.resolvePowerOfTea(card, row, col);
    }
    return { success: false, reason: "Action card not supported" };
  }

  private resolvePowerOfTea(card: ActionCard, row: number, col: number): PlayResult {
    // Reveal opponent's card
    const opponent = this.game.opponentOf(this.game.currentPlayer);
    const targetCard = opponent.field[row]?.[col];
    if (targetCard) {
      targetCard.facedUp = true;
    }

    // Discard action card
    this.game.discard(this.game.currentPlayer.removeFromHand(card.instanceId) as Card);

    return { success: true };
  }
  //End Play card logic suite

  // Begin can Play Card Validation Suite
  canPlayCard(
  playerIndex: number,
  cardId: string | null,
  row: number,
  col: number
  ): boolean {
    if (this.isGameOver()) return false;
    const player = this.game.players[playerIndex];

    // ATTACK FLOW
    if (this.pendingAction === "attack") {
      // selecting target
      return player !== this.game.currentPlayer &&
            !!player.field[row]?.[col] && player.field[row]?.[col]?.type === "creature";
    }

    // START ATTACK
    if (
      this.pendingAction === null &&
      player === this.game.currentPlayer &&
      this.canAttackWith(row, col)
    ) {
      return true;
    }

    // REINFORCE FLOW
    const card = this.game.currentPlayer.hand.find(c => c.instanceId === cardId);
    if (!card) return false;
    // Moves left, draw-first and first-turn rules
    if (!this.canPlayHandCard(this.game.currentPlayer, card)) return false;

    switch (card.type) {
      case "creature":
        return player === this.game.currentPlayer && canPlaceCreature(player, card, row, col);
      case "upgrade":
        return player === this.game.currentPlayer && canPlaceUpgrade(player, row, col);
      case "action":
        return this.canUseAction(player, card as ActionCard, row, col);
    }

    return false;
  }


  canUseAction(
    player: Player,
    card: ActionCard,
    row: number,
    col: number
  ): boolean {
    switch(card.actionType) {
      case "powerOfTea":
        // Power of Tea targets opponent's field
        return (this.pendingAction == "powerOfTea" && this.game.currentPlayer !== player && !!player.field[row]?.[col])
    }
    return false;
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

  //Play Hand Card Logic suite
  playHandCard(player: Player, card: Card): PlayResult {
    if (!this.canPlayHandCard(player, card)) {
      return { success: false, reason: "Cannot play this card" };
    }
    this.resetTemporaryEffectsIfNeeded();
    switch (card.type) {
      case "creature":
        return {success: true};
      case "upgrade":
        return {success: true};
      case "action":
        return this.playHandActionCard(player, card as ActionCard);
    }
    
    return { success: false, reason: "Unknown card type" };
  }

  playHandActionCard(player: Player, card: ActionCard): PlayResult {
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
    this.game.temporaryEffects.push({
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
  canPlayHandCard(player: Player, card: Card): boolean {
    const canPlay = this.canMakeMove() && player === this.game.currentPlayer && player.hand.includes(card);
    if (canPlay === false) return false;
    // First turn: only a creature may be played
    if (this.isFirstTurn() && card.type !== "creature") return false;
    else {
      if (card.type === "upgrade") return hasUpgradeSlot(player);
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
  interactWithOpponentCard(player: Player, selectedCardId: string | null, card: Card): PlayResult { 
    if (!this.canInteractWithOpponentCard(player)) {
      return { success: false, reason: "Cannot interact with this card" };
    }
    if (!selectedCardId) {
      return { success: false, reason: "No card selected" };
    }

    switch (this.pendingAction) {
      case "stealCard": {
        // Validate before touching any state so a failed attempt costs nothing
        if (!player.hand.some(c => c.type === card.type)) {
          return { success: false, reason: "No cards of that type to steal" };
        }

        this.resetTemporaryEffectsIfNeeded();
        const result = this.resolveSteal(player, selectedCardId, card);
        if (result.success) {
          this.game.turn.useMove();
        }
        return result;
      }
    }
    return {success: false, reason: "No interaction performed"};
  }

  private resolveSteal(player: Player, selectedCardId: string, card: Card): PlayResult {

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

    this.game.currentPlayer.hand.push(player.removeFromHand(stolen.instanceId) as Card);

    // Clear pending state
    this.pendingAction = null;

    this.game.discard(this.game.currentPlayer.removeFromHand(selectedCardId) as Card);

    return { success: true };
  }
  //End interact with opponent hand

  //can interact with Opponent Card Logic suite
  canInteractWithOpponentCard(player: Player): boolean {
    if (this.isGameOver()) return false;
    if (player === this.game.currentPlayer) return false;
    return this.pendingAction === "stealCard";
  }
  // End can interact with opponent card logic suite

  //Interact with Discard pile Logic suite
  selectDiscardPileCard(player: Player, selectedCardId: string | null, card: Card): PlayResult {
    if (selectedCardId == null) {
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
        const result = this.resolveRevive(player, selectedCardId, card);
        if (result.success) {
          this.game.turn.useMove();
        }
        return result;
      }
    }
    return {success: false, reason: "No interaction performed"};
  }

  resolveRevive(player: Player, selectedCardId: string | null, card: Card): PlayResult {
    player.hand.push(this.game.discardPile.splice(this.game.discardPile.indexOf(card), 1)[0]);
    //Discard action card
    this.game.discard(this.game.currentPlayer.removeFromHand(selectedCardId as string) as Card);
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
  isCardVisibleToPlayer(card: Card, playerIndex: number): boolean {
    // Player sees their own cards
    if (playerIndex === this.game.currentPlayerIndex) {
      return true;
    }

    // permanent visibility
    if (card.facedUp) return true;

    // temporary effects
    const revealEffect = this.game.temporaryEffects.find(
      e =>
        e.type === "revealHand" &&
        e.targetPlayerId === this.game.players[playerIndex].id &&
        e.sourcePlayerId === this.game.currentPlayer.id
    );

    if (revealEffect && this.game.players[playerIndex].hand.includes(card)) {
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
    const revealIndex = this.game.temporaryEffects.findIndex(
      e =>
        e.type === "revealHand" &&
        e.sourcePlayerId === player.id
    );

    if (revealIndex !== -1) {
      // Remove the reveal effect
      this.game.temporaryEffects.splice(revealIndex, 1);

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

    // LOSS CHECK
    if (this.checkLossCondition(this.game.currentPlayer)) {
      return { success: true };
    }

    // Counts the finished turn, passes play on, and resets the turn state
    this.game.nextTurn();

    this.checkTieCondition();
    return { success: true };
  }
}