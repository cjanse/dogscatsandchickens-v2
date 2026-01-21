import { GameBoard } from "../model/game/GameBoard";
import { Player } from "../model/game/Player";
import { DeckFactory } from "../model/deck/DeckFactory";
import type { CardData } from "../model/types/CardData";
import { Card } from "../model/cards/Card";
import { ActionCard } from "../model/cards/ActionCard";
import type { UpgradeCard } from "../model/cards/UpgradeCard";
import type { CreatureCard } from "../model/cards/CreatureCard";
import type { CreatureType } from "../model/types/CreatureType";

//Types

export type PlayResult =
  | { success: true }
  | { success: false; reason: string };

export type PendingAction = "revealHand" | "stealCard" | "powerOfTea" | "actionRevive" | "creatureRevive" | "upgradeRevive" | "attack" | "discardExtraCards" | null;

export type TurnType = "reinforce" | "attack"

export type GameResult =
  | { state: "ongoing" }
  | { state: "win"; winnerId: number }
  | { state: "loss"; loserId: number }
  | { state: "tie" };

export class GameController {
  private game: GameBoard;
  private pendingAction: PendingAction = null
  private movesThisTurn: number = 0;
  private maxMovesPerTurn: number = 2;
  private turnType: TurnType = "reinforce";
  private attackingCard: {
    card: CreatureCard;
    row: number;
    col: number;
  } | null = null;
  private hasDrawn: boolean = false;
  private gameResult: GameResult = { state: "ongoing" };
  private allowExtraAttack: boolean = false;

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
    
    // Set moves for first turn (1 move)
    this.updateMaxMovesPerTurn();
  }

  private updateMaxMovesPerTurn(): void {
    // First turn for each player has 1 move, subsequent turns have 2 moves
    const currentPlayer = this.game.currentPlayer;
    this.maxMovesPerTurn = currentPlayer.turnCount === 0 ? 1 : 2;
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
    return this.maxMovesPerTurn - this.movesThisTurn;
  }

  getMaxMoves(): number {
    return this.maxMovesPerTurn;
  }

  //turn type logic
  getTurnType(): TurnType {
    return this.turnType;
  }

  setTurnType(turnType: TurnType) {
    this.turnType = turnType;
  }

  //game result logic suite
  getGameResult(): GameResult {
    return this.gameResult;
  }

  isGameOver(): boolean {
    return this.gameResult.state !== "ongoing";
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
      this.gameResult = {
        state: "loss",
        loserId: player.id
      };
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
      this.gameResult = { state: "tie" };
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
    this.hasDrawn = true;
  }

  canDrawCard(playerIndex: number): boolean {
    const player = this.game.players[playerIndex];
    return !this.hasDrawn && player === this.game.currentPlayer && this.game.deck.size > 0 && player.turnCount != 0 && this.movesThisTurn == 0 && this.playerHasCreatures(player); //&& this.movesThisTurn == 0
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
      result = this.playActionCard(player, card as ActionCard, row, col);
      break;

    default:
      return { success: false, reason: "Unknown card type" };
  }

  if (result.success) {
    this.movesThisTurn += 1;
  }

  return result;
}

  startAttack(row: number, col: number): PlayResult {
    const card = this.game.currentPlayer.field[row]?.[col];

    if (!card || card.type !== "creature") {
      return { success: false, reason: "No creature to attack with" };
    }

    const creature = card as CreatureCard;

    // Check if this is first attack or if the attacking creature is a matched cat (can attack multiple times)
    if (this.movesThisTurn !== 0 && !(creature.matched && creature.creatureType === "cat" && this.allowExtraAttack)) {
      return { success: false, reason: "Attacks must be first move" };
    }

    this.attackingCard = {
      card: creature,
      row,
      col
    };

    this.turnType = "attack";
    this.pendingAction = "attack";

    return { success: true };
  }

  resolveAttack(row: number, col: number): PlayResult {
    if (!this.attackingCard) {
      return { success: false, reason: "No attack started" };
    }

    const opponent = this.game.players.find(
      p => p !== this.game.currentPlayer
    ) as Player;

    const defender = opponent.field[row]?.[col];

    if (!defender || defender.type !== "creature") {
      return { success: false, reason: "Invalid attack target" };
    }

    this.executeAttack(
      opponent,
      this.attackingCard.card,
      row,
      col
    );

    // cleanup
    const wasMatchedCatAttack = this.attackingCard?.card.matched && this.attackingCard?.card.creatureType === "cat";
    this.attackingCard = null;
    this.pendingAction = null;
    
    // Always consume the turn
    this.movesThisTurn = this.maxMovesPerTurn;
    
    // For matched cats, allow them to attack again
    if (wasMatchedCatAttack) {
      this.allowExtraAttack = true;
      // Keep turnType as "attack" so player can click the cat again
    } else {
      this.allowExtraAttack = false;
    }

    return { success: true };
  }

  private executeAttack(
  opponent: Player,
  attacker: CreatureCard,
  targetRow: number,
  targetCol: number
  ): void {
    const defender = opponent.field[targetRow][targetCol] as CreatureCard;

    attacker.facedUp = true;
    defender.facedUp = true;

    const rules: Record<CreatureType, CreatureType> = {
      dog: "cat",
      cat: "chicken",
      chicken: "dog"
    };

    const attackerWins = rules[attacker.creatureType] === defender.creatureType;
    const defenderWins = rules[defender.creatureType] === attacker.creatureType;

    const currentPlayer = this.game.currentPlayer;
    const attackerRow = this.attackingCard!.row;

    if (attackerWins || (attacker.matched && attacker.creatureType === "dog" && defender.creatureType === "dog")) {
      if (!this.checkUpgrades(currentPlayer, attackerRow, opponent, targetRow)) {
        this.discardLosingRow(opponent, targetRow);
      }
    } else if (defenderWins) {  
      this.discardLosingRow(currentPlayer, attackerRow);
    }
  }

  private checkUpgrades(winner: Player, winRowIndex: number, loser: Player, loseRowIndex: number): boolean
  {
    const loserField = loser.field;
    const loserRow = loserField[loseRowIndex];
    const winnerField = winner.field;
    const winnerRow = winnerField[winRowIndex];

    let creatureSurvives = false;

    // Activate upgrade if there is an upgrade
    const upgrade1 = loserRow[3] as UpgradeCard | null;
    if (upgrade1) {
      creatureSurvives = this.activateUpgrade(upgrade1, loser, loseRowIndex, winner, winRowIndex);
      // Get rid of upgrade
      this.game.discard(upgrade1);
      loserRow[3] = null;
    }
    //self destruct and revive do not stack
    if (upgrade1?.upgradeType === "selfDestruct" || upgrade1?.upgradeType === "revive") {
      return creatureSurvives;
    }
    const upgrade2 = loserRow[2] as UpgradeCard | null;
    if (!creatureSurvives && upgrade2) {
      creatureSurvives = this.activateUpgrade(upgrade2, loser, loseRowIndex, winner, winRowIndex);
      // Get rid of upgrade
      this.game.discard(upgrade2);
      loserRow[2] = null;
    }

    return creatureSurvives;
  }

  private activateUpgrade(upgradeCard: UpgradeCard, loser: Player, loseRowIndex: number, winner: Player, winRowIndex: number): boolean {
    switch (upgradeCard.upgradeType) {
      case "counterAttack":
      case "defense":
        return true;
      case "fakeUpgrade":
        return false;
      case "selfDestruct":
        this.discardLosingRow(winner, winRowIndex);
        return false;
      case "revive":
        this.resolveUpgradeRevive(loser, loseRowIndex);
        return false
    }
    return false;
  }

  private resolveUpgradeRevive(loser: Player, loseRowIndex: number): void {
    for (let col = 0; col < 2; col++) {
      const card = loser.field[loseRowIndex][col];
      if (card) {
        loser.addToHand(card as Card);
        loser.field[loseRowIndex][col] = null;
      }
    }
  }

  //handles losing creature
  private discardLosingRow(player: Player, rowIndex: number): void {
    const field = player.field;
    const row = field[rowIndex];

    for (let i = 0; i < row.length; i++) {
      if (row[i]) {
        this.game.discard(row[i]!);
        row[i] = null;
      }
    }

    // remove middle rows only
    if (rowIndex !== 0 && rowIndex !== field.length - 1) {
      field.splice(rowIndex, 1);
    }
  }



  private playCreatureCard(
    player: Player,
    card: CreatureCard,
    row: number,
    col: number
  ): PlayResult {
    const matchedResult = player.playToField(card.instanceId, row, col);
    
    // Handle matched ability activation
    if (matchedResult) {
      this.activateMatchedAbility(matchedResult.matchedCard, player);
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

  private activateMatchedAbility(matchedCard: CreatureCard, player: Player): void {
    const opponent = this.game.players.find(
      p => p !== player
    ) as Player;

    switch (matchedCard.matchingAbilityType) {
      case "seeEverything":
        // Reveal all current opponent field cards
        this.revealOpponentFieldCards(opponent);
        break;
      case "multipleAttacks":
        // Cat ability allows multiple attacks - tracked separately
        // This is handled in startAttack method
        break;
      case "alwaysWin":
        // Dog ability is handled during combat
        break;
    }
  }

  private revealOpponentFieldCards(opponent: Player): void {
    for (const row of opponent.field) {
      for (const card of row) {
        if (card) {
          card.facedUp = true;
          console.log("Revealed card:", card.name, "facedUp:", card.facedUp);
        }
      }
    }
  }

  private playActionCard(
    player: Player,
    card: ActionCard,
    row: number,
    col: number
  ): PlayResult {
    switch (card.actionType) {
      case "powerOfTea":
        return this.resolvePowerOfTea(player, card, row, col);
    }
    return { success: false, reason: "Action card not supported" };
  }

  private resolvePowerOfTea(
  player: Player,
  card: ActionCard,
  row: number,
  col: number
  ): PlayResult {
    // Reveal opponent's card
    const opponent = this.game.players.find(p => p !== this.game.currentPlayer) as Player;
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
      player.field[row]?.[col]?.type === "creature"
    ) {
      const creature = player.field[row]?.[col] as CreatureCard;
      
      // Allow first attack (movesThisTurn === 0) or matched cat extra attack
      if (this.movesThisTurn === 0 || (this.allowExtraAttack && creature.matched && creature.creatureType === "cat")) {
        return true;
      }
    }

    // REINFORCE FLOW
    const card = this.game.currentPlayer.hand.find(c => c.instanceId === cardId);
    if (!card) return false;

    switch (card.type) {
      case "creature":
        return this.canPlaceCreature(player, card as CreatureCard, row, col);
      case "upgrade":
        return this.canPlaceUpgrade(player, card as UpgradeCard, row, col);
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
    const creature = player.field[row]?.[col];
    
    if (!creature || creature.type !== "creature") {
      return false;
    }

    // Allow first attack (movesThisTurn === 0) or matched cat extra attack
    if (this.movesThisTurn === 0 || (this.allowExtraAttack && creature.matched && (creature as CreatureCard).creatureType === "cat")) {
      return true;
    }
    
    return false;
  }

  isValidAttackTarget(row: number, col: number): boolean {
    const opponent = this.game.players.find(p => p !== this.game.currentPlayer);
    const target = opponent?.field[row]?.[col];
    
    return !!target && target.type === "creature";
  }

  canPlaceCreature(
    player: Player,
    card: CreatureCard,
    row: number,
    col: number
  ): boolean {
    if (player !== this.game.currentPlayer) return false;
    if (col !== 0 && col !== 1) return false;
    if (player.field[row]?.[col]) return false;

    const otherCol = col === 0 ? 1 : 0;
    const otherCreature = player.field[row]?.[otherCol];

    if (otherCreature && otherCreature.id !== card.id) return false;

    return true;
  }

  canPlaceUpgrade(
    player: Player,
    card: UpgradeCard,
    row: number,
    col: number
  ): boolean {
    if (!card) return false;
    if (player !== this.game.currentPlayer) return false;
    if (col !== 2 && col !== 3) return false;
    if (player.field[row]?.[col]) return false;
    if (!player.field[row]?.[2] && col === 3) return false;
    
    const hasCreature = player.field[row]?.[0] || player.field[row]?.[1];
    if (!hasCreature) return false;

    return true;
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
        return this.resolveMessyDorm(player, card);
      case "birdArmy":
        return this.resolveBirdArmy(player, card);
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

  private resolveMessyDorm(player: Player, card: ActionCard): PlayResult {
    const opponent = this.game.players.find(p => p !== player);
    if (!opponent) {
      return { success: false, reason: "Opponent not found" };
    }
      // Add temporary effect
    this.game.temporaryEffects.push({
      type: "revealHand",
      sourcePlayerId: player.id,
      targetPlayerId: opponent.id
    });

    this.pendingAction = "revealHand";

    return { success: true };
    }

  private resolveBirdArmy(player: Player, card: ActionCard): PlayResult {
    this.pendingAction = "stealCard";
    return { success: true };
  }
  //End Play Hand Card Logic

  //Can Play Hand Card Logic suite
  //TODO: ENHANCE CANPLAYHANDCARD FUNCTION
  canPlayHandCard(player: Player, card: Card): boolean {
    if (this.isGameOver()) return false;
    const canPlay = this.movesThisTurn < this.maxMovesPerTurn && player === this.game.currentPlayer && player.hand.includes(card);
    if (canPlay === false) return false;
    else {
      if (card.type === "upgrade") return this.canPlayHandUpgrade(player, card);
      else if (card.type === "action") return this.canPlayHandAction(player, card as ActionCard);
      else return true; //creature can ALWAYS be played
    }
  }

  canPlayHandUpgrade(player: Player, card: Card): boolean {
    const playableRows = player.field.filter(row => 
      row[3] == null && (row[0]?.type === 'creature' || row[1]?.type === 'creature')
    )

    return playableRows.length > 0;
  }

  canPlayHandAction(player: Player, card: ActionCard): boolean{
    switch (card.actionType) {
      case "powerOfTea":
        const playablePlaces = this.game.players[(this.game.currentPlayerIndex + 1) % 2].field.flat().filter(card => card?.facedUp === false)
        return playablePlaces.length > 0;
      case "messyDorm":
        return true;
      case "birdArmy":
        return this.game.players[(this.game.currentPlayerIndex + 1) % 2].hand.length > 0;
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
    if (!this.canInteractWithOpponentCard(player, card)) {
      return { success: false, reason: "Cannot interact with this card" };
    }
    if (!selectedCardId) {
      return { success: false, reason: "No card selected" };
    }
    const pendingAction: PendingAction = this.pendingAction;
    this.resetTemporaryEffectsIfNeeded();

    //Increase move counter
    this.movesThisTurn += 1;

    switch (pendingAction) {
      case "stealCard":
        // Remove card from opponent's hand
        return this.resolveSteal(player, selectedCardId as string, card);
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
  canInteractWithOpponentCard(player: Player, card: Card): boolean {
    if (this.isGameOver()) return false;
    if (player === this.game.currentPlayer) return false;
    return this.pendingAction === "stealCard";
  }
  // End can interact with opponent card logic suite

  //Interact with Discard pile Logic suite
  selectDiscardPileCard(player: Player, selectedCardId: string | null, card: Card): PlayResult {
    if (!this.canInteractWithDiscardPileCard(player, card) && selectedCardId != null) {
      return { success: false, reason: "Cannot interact with this card" };
    }
    const pendingAction: PendingAction = this.pendingAction;
    this.resetTemporaryEffectsIfNeeded();

    //Increase move counter
    this.movesThisTurn += 1;

    switch (pendingAction) {
      case "actionRevive":
      case "creatureRevive":
      case "upgradeRevive":
        // Remove card from discard pile
        return this.resolveRevive(player, selectedCardId, card);
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
  canInteractWithDiscardPileCard(player: Player, card: Card): boolean {
    if (this.isGameOver()) return false;
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
      this.movesThisTurn += 1;
    }
  }

  // Turn Management
  endTurn() {
    const currentPlayer = this.game.currentPlayer;

    // Increment current player's turn count for next turn
    currentPlayer.turnCount++;

    this.movesThisTurn = 0;
    this.turnType = "reinforce";
    this.hasDrawn = false;
    this.allowExtraAttack = false;
    this.resetTemporaryEffectsIfNeeded();

    // LOSS CHECK
    if (this.checkLossCondition(currentPlayer)) {
      return;
    }

    this.game.nextTurn();
    
    // Update max moves for the new turn
    this.updateMaxMovesPerTurn();

    this.checkTieCondition();
  }
}