import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Card } from "../../model/cards/Card";
import { createTestController, makeAction, makeCreature, makeUpgrade } from "./helpers";

describe("clicking the field", () => {
  it("starts an attack on the first move and resolves it on an opponent creature", () => {
    const { controller, players } = createTestController();
    const attacker = players[0].field[0][0];

    expect(controller.canClickField(players[0], 0, 0)).toBe(true);
    expect(controller.clickField(players[0], 0, 0)).toEqual({ success: true });

    expect(controller.getPendingAction()).toBe("attack");
    expect(controller.getSelectedCard()).toBe(attacker);

    // Mid-attack only the opponent's creatures can be clicked, so clicking your own creature does nothing
    expect(controller.canClickField(players[0], 0, 0)).toBe(false);
    expect(controller.clickField(players[0], 0, 0).success).toBe(false);
    expect(controller.getPendingAction()).toBe("attack");
    expect(controller.canClickField(players[1], 0, 0)).toBe(true);

    expect(controller.clickField(players[1], 0, 0)).toEqual({ success: true });

    expect(controller.getPendingAction()).toBeNull();
    expect(controller.getSelectedCard()).toBeNull();
    expect(controller.getMovesLeft()).toBe(0);
  });

  it("does not let the player attack by clicking an opponent creature before starting an attack", () => {
    const { controller, players } = createTestController();

    expect(controller.canClickField(players[1], 0, 0)).toBe(false);
    expect(controller.clickField(players[1], 0, 0).success).toBe(false);
    expect(controller.getMovesLeft()).toBe(2);
  });

  it("places the selected card on your own field, and nowhere else", () => {
    const twin = makeCreature(); // matches the Dog at row 0, col 0
    const { controller, players } = createTestController({ hands: [[twin], []] });

    expect(controller.clickHandCard(twin)).toEqual({ success: true });
    expect(controller.getSelectedCard()).toBe(twin);

    // Not on the opponent's field, and not on top of your own creature. Holding a card is not an attack.
    expect(controller.canClickField(players[1], 0, 0)).toBe(false);
    expect(controller.canClickField(players[0], 0, 0)).toBe(false);
    expect(controller.canClickField(players[0], 0, 1)).toBe(true);

    expect(controller.clickField(players[0], 0, 1)).toEqual({ success: true });

    expect(players[0].field[0][1]).toBe(twin);
    expect(players[0].hand).toEqual([]);
    expect(controller.getSelectedCard()).toBeNull();
    expect(controller.getMovesLeft()).toBe(1);
    expect(controller.getPendingAction()).toBeNull();
  });

  it("lets a matched Cat start another attack after the first one", () => {
    const cat = makeCreature("att_cat", "cat");
    const twin = makeCreature("att_cat", "cat");
    cat.matched = true;
    twin.matched = true;
    const { controller, players } = createTestController({
      fields: [[cat, twin], [makeCreature("def_cat", "cat")]],
    });

    expect(controller.clickField(players[0], 0, 0).success).toBe(true);
    expect(controller.clickField(players[1], 0, 0).success).toBe(true);

    // The turn is spent, but turnType stays "attack" and the Cat may go again
    expect(controller.getMovesLeft()).toBe(0);
    expect(controller.getTurnType()).toBe("attack");
    expect(controller.canClickField(players[0], 0, 0)).toBe(true);

    expect(controller.clickField(players[0], 0, 0).success).toBe(true);
    expect(controller.getPendingAction()).toBe("attack");
    expect(controller.getSelectedCard()).toBe(cat);
  });

  it("drops the attack from the turn state when a hand card is picked up instead", () => {
    const creature = makeCreature("new_creature", "chicken");
    const { controller, game, players } = createTestController({ hands: [[creature], []] });

    controller.clickField(players[0], 0, 0);
    expect(controller.getPendingAction()).toBe("attack");

    expect(controller.clickHandCard(creature).success).toBe(true);
    expect(controller.getPendingAction()).toBeNull();
    expect(game.turn.attackingCard).toBeNull();

    expect(controller.clickField(players[0], -1, 0).success).toBe(true);
    expect(controller.getTurnType()).toBe("reinforce");
    expect(game.turn.attackingCard).toBeNull();
  });

  it("keeps the turn an attack turn when a matched Cat's extra attack is cancelled", () => {
    const cat = makeCreature("att_cat", "cat");
    const twin = makeCreature("att_cat", "cat");
    cat.matched = true;
    twin.matched = true;
    const { controller, game, players } = createTestController({
      fields: [[cat, twin], [makeCreature("def_cat", "cat")]],
    });
    controller.clickField(players[0], 0, 0);
    controller.clickField(players[1], 0, 0);
    controller.clickField(players[0], 0, 0);
    expect(game.turn.attackingCard).not.toBeNull();

    controller.deselectCard();

    expect(controller.getPendingAction()).toBeNull();
    expect(game.turn.attackingCard).toBeNull();
    expect(controller.getTurnType()).toBe("attack");
  });

  it("does not start an attack on a first turn", () => {
    const { controller, players } = createTestController({ turnCounts: [0, 0] });

    expect(controller.canClickField(players[0], 0, 0)).toBe(false);
    expect(controller.clickField(players[0], 0, 0).success).toBe(false);
    expect(controller.getPendingAction()).toBeNull();
  });

  it("does not start an attack before the player has drawn", () => {
    const { controller, players } = createTestController({ deck: [makeCreature("deck_1")] });

    expect(controller.canClickField(players[0], 0, 0)).toBe(false);

    controller.drawCard();

    expect(controller.canClickField(players[0], 0, 0)).toBe(true);
  });

  it("does nothing once the game is over", () => {
    const { controller, players } = createTestController({ fields: [[], [makeCreature()]] });
    controller.endTurn(); // player 0 has no creatures, so they lose
    expect(controller.isGameOver()).toBe(true);

    expect(controller.canClickField(players[1], 0, 0)).toBe(false);
  });
});

describe("selecting hand cards", () => {
  it("selects a card, deselects it on a second click, and swaps the selection when another is clicked", () => {
    const first = makeCreature("first");
    const second = makeCreature("second");
    const { controller } = createTestController({ hands: [[first, second], []] });

    controller.clickHandCard(first);
    expect(controller.getSelectedCard()).toBe(first);

    controller.clickHandCard(second);
    expect(controller.getSelectedCard()).toBe(second);

    controller.clickHandCard(second);
    expect(controller.getSelectedCard()).toBeNull();
  });

  it("clears the selection when the turn ends", () => {
    const creature = makeCreature("held");
    const { controller } = createTestController({ hands: [[creature], []] });

    controller.clickHandCard(creature);
    controller.endTurn();

    expect(controller.getSelectedCard()).toBeNull();
  });

  it("does not select a card the player can't play", () => {
    const upgrade = makeUpgrade();
    const { controller } = createTestController({
      hands: [[upgrade], []],
      turnCounts: [0, 0], // only a creature may be played on a first turn
    });

    expect(controller.clickHandCard(upgrade).success).toBe(false);
    expect(controller.getSelectedCard()).toBeNull();
  });

  it("discards the clicked card during the discard phase", () => {
    const cards = Array.from({ length: 6 }, (_, i) => makeCreature(`card_${i}`));
    const { controller, game, players } = createTestController({ hands: [cards, []] });

    expect(controller.startDiscardPhase().success).toBe(true);
    expect(controller.clickHandCard(cards[0]).success).toBe(true);

    expect(game.discardPile).toEqual([cards[0]]);
    expect(players[0].hand).toHaveLength(5);
    expect(controller.getPendingAction()).toBeNull();
    expect(controller.getSelectedCard()).toBeNull();
  });

  it("rejects placing a card that is not in the current player's hand", () => {
    const stranger = makeCreature();
    const { controller, players } = createTestController();

    expect(controller.canPlayCard(players[0], stranger, 0, 1)).toBe(false);
    expect(controller.playCard(players[0], stranger, 0, 1).success).toBe(false);
    expect(players[0].field[0][1]).toBeNull();
  });
});

describe("Power of Tea", () => {
  it("reveals the clicked opponent card, discards the Tea card and uses a move", () => {
    const tea = makeAction("Power_of_Tea_1", "powerOfTea");
    const { controller, game, players } = createTestController({ hands: [[tea], []] });
    const target = players[1].field[0][0] as Card;
    expect(target.facedUp).toBe(false);

    expect(controller.clickHandCard(tea).success).toBe(true);
    expect(controller.getPendingAction()).toBe("powerOfTea");

    // Only the opponent's field is a valid target, and a click there is not an attack
    expect(controller.canClickField(players[0], 0, 0)).toBe(false);
    expect(controller.canClickField(players[1], 0, 0)).toBe(true);

    expect(controller.clickField(players[1], 0, 0)).toEqual({ success: true });

    expect(target.facedUp).toBe(true);
    expect(game.discardPile).toEqual([tea]);
    expect(players[0].hand).toEqual([]);
    expect(controller.getMovesLeft()).toBe(1);
    expect(controller.getPendingAction()).toBeNull();
    expect(controller.getSelectedCard()).toBeNull();
  });

  it("does nothing to the opponent's field until a Tea card is selected", () => {
    const tea = makeAction("Power_of_Tea_1", "powerOfTea");
    const { controller, players } = createTestController({ hands: [[tea], []] });

    expect(controller.canClickField(players[1], 0, 0)).toBe(false);
    expect(players[1].field[0][0]?.facedUp).toBe(false);
  });

  it("refuses a target that is already face up, and keeps the Tea card and the move", () => {
    const tea = makeAction("Power_of_Tea_1", "powerOfTea");
    const faceUp = makeCreature("face_up", "cat");
    const faceDown = makeCreature("face_down", "cat");
    const { controller, game, players } = createTestController({ hands: [[tea], []], fields: [[makeCreature()], [faceUp]] });
    players[1].field.push([faceDown, null, null, null]);
    faceUp.reveal();

    controller.clickHandCard(tea);
    expect(controller.canClickField(players[1], 0, 0)).toBe(false);
    expect(controller.clickField(players[1], 0, 0).success).toBe(false);

    expect(players[0].hand).toEqual([tea]);
    expect(game.discardPile).toEqual([]);
    expect(controller.getMovesLeft()).toBe(2);
    expect(controller.getPendingAction()).toBe("powerOfTea");

    // The face-down card is still a valid target
    expect(controller.clickField(players[1], 1, 0)).toEqual({ success: true });
    expect(faceDown.facedUp).toBe(true);
  });
});

describe("Spirits and the discard pile", () => {
  it("only lets the selected Spirit pick a card of its own kind", () => {
    const beach = makeAction("Beach_Spirits", "spirit");
    const deadCreature = makeCreature("dead");
    const deadUpgrade = makeUpgrade();
    const { controller, game, players } = createTestController({ hands: [[beach], []] });
    game.discard(deadCreature);
    game.discard(deadUpgrade);

    expect(controller.canInteractWithDiscardPileCard(deadUpgrade)).toBe(false);

    controller.clickHandCard(beach);
    expect(controller.getPendingAction()).toBe("upgradeRevive");
    expect(controller.canInteractWithDiscardPileCard(deadCreature)).toBe(false);
    expect(controller.canInteractWithDiscardPileCard(deadUpgrade)).toBe(true);

    expect(controller.selectDiscardPileCard(deadUpgrade)).toEqual({ success: true });
    expect(players[0].hand).toEqual([deadUpgrade]);
    expect(game.discardPile).toEqual([deadCreature, beach]);
    expect(controller.getMovesLeft()).toBe(1);
  });
});

describe("Messy Dorm and the selection", () => {
  it("discards the Dorm and charges one move when another card is selected", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const creature = makeCreature("held");
    const { controller, game } = createTestController({ hands: [[dorm, creature], []] });

    controller.clickHandCard(dorm);
    expect(controller.getSelectedCard()).toBe(dorm);
    expect(game.temporaryEffects).toHaveLength(1);

    controller.clickHandCard(creature);

    expect(controller.getSelectedCard()).toBe(creature);
    expect(game.temporaryEffects).toHaveLength(0);
    expect(game.discardPile).toEqual([dorm]);
    expect(controller.getMovesLeft()).toBe(1);
  });

  it("discards the Dorm and charges one move when it is deselected", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const { controller, game } = createTestController({ hands: [[dorm], []] });

    controller.clickHandCard(dorm);
    controller.clickHandCard(dorm);

    expect(controller.getSelectedCard()).toBeNull();
    expect(game.discardPile).toEqual([dorm]);
    expect(controller.getMovesLeft()).toBe(1);
  });

  it("discards the Dorm that was played when the hand holds two", () => {
    const otherDorm = makeAction("Messy_Dorm_1", "messyDorm");
    const playedDorm = makeAction("Messy_Dorm_1", "messyDorm");
    const { controller, game, players } = createTestController({ hands: [[otherDorm, playedDorm], []] });

    controller.clickHandCard(playedDorm);
    controller.clickHandCard(playedDorm);

    expect(game.discardPile).toEqual([playedDorm]);
    expect(players[0].hand).toEqual([otherDorm]);
  });

  it("shows the opponent's hand to the Dorm player while the reveal lasts", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const held = makeCreature("held");
    const { controller, players } = createTestController({ hands: [[dorm], [held]] });

    expect(controller.isCardVisibleToPlayer(held, players[1])).toBe(false);
    controller.clickHandCard(dorm);
    expect(controller.isCardVisibleToPlayer(held, players[1])).toBe(true);
    controller.clickHandCard(dorm);
    expect(controller.isCardVisibleToPlayer(held, players[1])).toBe(false);
  });

  it("charges the Dorm's move as soon as it is played", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const { controller } = createTestController({ hands: [[dorm], []] });

    controller.clickHandCard(dorm);

    expect(controller.getMovesLeft()).toBe(1);
  });

  // Regression: the Dorm used to be charged only when the reveal ended, after the next card had
  // already been checked against the moves left, so a Dorm on the last move gave a free action.
  describe("on the last move of the turn", () => {
    function lastMoveWithDorm(next: Card, opponentHand: Card[] = []) {
      const dorm = makeAction("Messy_Dorm_1", "messyDorm");
      const setup = createTestController({ hands: [[dorm, next], opponentHand] });
      setup.game.turn.useMove(); // one of the two moves is already spent
      expect(setup.controller.clickHandCard(dorm)).toEqual({ success: true });
      return setup;
    }

    it("won't start a Bird Army steal after the Dorm", () => {
      const birdArmy = makeAction("Bird_Army_1", "birdArmy");
      const target = makeCreature("opp_card");
      const { controller, game, players } = lastMoveWithDorm(birdArmy, [target]);

      expect(controller.clickHandCard(birdArmy).success).toBe(false);
      expect(controller.interactWithOpponentCard(players[1], target).success).toBe(false);

      expect(players[1].hand).toEqual([target]);
      expect(game.turn.movesThisTurn).toBe(game.maxMovesPerTurn);
    });

    it("won't start a Spirit revive after the Dorm", () => {
      const spirits = makeAction("Forest_Spirits", "spirit");
      const fallen = makeCreature("fallen");
      const { controller, game, players } = lastMoveWithDorm(spirits);
      game.discard(fallen);

      expect(controller.clickHandCard(spirits).success).toBe(false);
      expect(controller.selectDiscardPileCard(fallen).success).toBe(false);

      expect(game.discardPile).toContain(fallen);
      expect(players[0].hand).not.toContain(fallen);
      expect(game.turn.movesThisTurn).toBe(game.maxMovesPerTurn);
    });

    it("won't let a creature be picked up after the Dorm", () => {
      const creature = makeCreature("held");
      const { controller, players } = lastMoveWithDorm(creature);

      expect(controller.clickHandCard(creature).success).toBe(false);
      expect(controller.canPlayHandCard(players[0], creature)).toBe(false);
    });
  });
});

describe("the card behind a pending action", () => {
  it("discards the card that started a steal, not some other card in hand", () => {
    const birdArmy = makeAction("Bird_Army_1", "birdArmy");
    const bystander = makeCreature("bystander");
    const stealable = makeCreature("opp_card");
    const { controller, game, players } = createTestController({
      hands: [[bystander, birdArmy], [stealable]],
    });

    controller.clickHandCard(birdArmy);
    expect(controller.interactWithOpponentCard(players[1], stealable).success).toBe(true);

    expect(game.discardPile).toEqual([birdArmy]);
    expect(players[0].hand).toEqual(expect.arrayContaining([bystander, stealable]));
    expect(players[0].hand).toHaveLength(2);
    expect(controller.getSelectedCard()).toBeNull();
  });

  it("discards the card that started a revive, not some other card in hand", () => {
    const spirits = makeAction("Forest_Spirits", "spirit");
    const bystander = makeCreature("bystander");
    const discarded = makeCreature("discarded_dog");
    const { controller, game, players } = createTestController({ hands: [[bystander, spirits], []] });
    game.discard(discarded);

    controller.clickHandCard(spirits);
    expect(controller.selectDiscardPileCard(discarded).success).toBe(true);

    expect(game.discardPile).toEqual([spirits]);
    expect(players[0].hand).toEqual(expect.arrayContaining([bystander, discarded]));
    expect(players[0].hand).toHaveLength(2);
    expect(controller.getSelectedCard()).toBeNull();
  });

  it("refuses a steal when the clicked card is not in the opponent's hand", () => {
    const birdArmy = makeAction("Bird_Army_1", "birdArmy");
    const elsewhere = makeCreature("elsewhere");
    const { controller, game, players } = createTestController({
      hands: [[birdArmy], [makeCreature("opp_card")]],
    });

    controller.clickHandCard(birdArmy);
    const result = controller.interactWithOpponentCard(players[1], elsewhere);

    expect(result.success).toBe(false);
    expect(controller.getMovesLeft()).toBe(2);
    expect(controller.getPendingAction()).toBe("stealCard");
    expect(game.discardPile).toEqual([]);
  });

  it("does not act on an opponent's hand card without a pending steal", () => {
    const opponentCard = makeCreature("opp_card");
    const { controller, players } = createTestController({ hands: [[makeCreature("mine")], [opponentCard]] });

    expect(controller.interactWithOpponentCard(players[1], opponentCard).success).toBe(false);
    expect(players[1].hand).toEqual([opponentCard]);
  });
});

describe("drawing returns a result", () => {
  it("succeeds once, then explains why a second draw is refused", () => {
    const { controller, players } = createTestController({
      deck: [makeCreature("deck_1"), makeCreature("deck_2")],
    });

    expect(controller.drawCard()).toEqual({ success: true });
    expect(controller.drawCard().success).toBe(false);
    expect(players[0].hand).toHaveLength(1);
  });

  it("refuses a draw from an empty deck", () => {
    const { controller } = createTestController();

    expect(controller.drawCard().success).toBe(false);
  });
});

describe("finishTurn and the AI", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** The AI (player 1) is on its first turn with an empty hand, so its turn is just "end the turn". */
  function setupAgainstAI() {
    return createTestController({
      deck: [makeCreature("deck_1")],
      turnCounts: [1, 0],
      player2IsAI: true,
    });
  }

  it("plays the AI's turn after the delay and hands play back to the human", () => {
    const { controller, game, players } = setupAgainstAI();
    controller.drawCard();

    expect(controller.finishTurn().success).toBe(true);

    // The AI waits before acting
    expect(game.currentPlayerIndex).toBe(1);
    expect(players[1].turnCount).toBe(0);

    vi.advanceTimersByTime(controller.aiTurnDelayMs);

    expect(players[1].turnCount).toBe(1);
    expect(game.currentPlayerIndex).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("notifies subscribers when the turn ends and after the AI has played", () => {
    const { controller } = setupAgainstAI();
    controller.drawCard();
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.finishTurn();
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(controller.aiTurnDelayMs);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("notifies once for a whole AI turn, however many moves the AI makes", () => {
    const { controller, players } = createTestController({
      deck: [makeCreature("deck_1"), makeCreature("deck_2")],
      hands: [[], [makeCreature("ai_1", "cat"), makeCreature("ai_2", "chicken")]],
      // Dog vs Dog is a stand-off, so a random AI attack can't cost it its only creature and end the game
      fields: [[makeCreature()], [makeCreature("ai_dog")]],
      player2IsAI: true,
    });
    controller.drawCard();
    controller.finishTurn();
    const listener = vi.fn();
    controller.subscribe(listener);

    vi.advanceTimersByTime(controller.aiTurnDelayMs);

    expect(players[1].turnCount).toBe(2); // the AI played its turn
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying a subscriber that unsubscribed", () => {
    const { controller } = setupAgainstAI();
    controller.drawCard();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    unsubscribe();

    controller.finishTurn();
    vi.advanceTimersByTime(controller.aiTurnDelayMs);

    expect(listener).not.toHaveBeenCalled();
  });

  it("cancels a pending AI turn on dispose", () => {
    const { controller, game, players } = setupAgainstAI();
    controller.drawCard();
    controller.finishTurn();

    controller.dispose();
    vi.advanceTimersByTime(controller.aiTurnDelayMs * 10);

    expect(game.currentPlayerIndex).toBe(1);
    expect(players[1].turnCount).toBe(0);
  });

  it("won't let End Turn end the AI's turn while it is still thinking", () => {
    const { controller, game, players } = setupAgainstAI();
    controller.drawCard();
    controller.finishTurn();
    expect(game.currentPlayerIndex).toBe(1);

    // The AI is on its first turn, so endTurn alone would allow it
    expect(controller.canEndTurn()).toBe(true);
    expect(controller.canFinishTurn()).toBe(false);
    expect(controller.finishTurn()).toEqual({ success: false, reason: "Wait for the AI to finish its turn" });
    expect(players[1].turnCount).toBe(0);

    // The AI still plays its own turn afterwards
    vi.advanceTimersByTime(controller.aiTurnDelayMs);
    expect(players[1].turnCount).toBe(1);
    expect(game.currentPlayerIndex).toBe(0);
    // Back to the human (the deck is empty, so no draw is owed): End Turn works again
    expect(controller.canFinishTurn()).toBe(true);
  });

  it("schedules nothing when the next player is human", () => {
    const { controller } = createTestController({ player2IsAI: false });

    expect(controller.finishTurn().success).toBe(true);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("schedules nothing, and reports why, when the turn can't end", () => {
    const { controller, game } = setupAgainstAI(); // the human still owes a draw

    expect(controller.finishTurn()).toEqual({ success: false, reason: "You must draw first" });

    expect(vi.getTimerCount()).toBe(0);
    expect(game.currentPlayerIndex).toBe(0);
  });

  it("schedules nothing when ending the turn ends the game", () => {
    const { controller } = createTestController({
      fields: [[], [makeCreature("test_cat", "cat")]],
      player2IsAI: true,
    });

    expect(controller.finishTurn().success).toBe(true);

    expect(controller.isGameOver()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("notifying views", () => {
  function subscribed(setup: Parameters<typeof createTestController>[0] = {}) {
    const test = createTestController(setup);
    const listener = vi.fn();
    test.controller.subscribe(listener);
    return { ...test, listener };
  }

  it("notifies once and bumps the version after a human action", () => {
    const { controller, listener } = subscribed({ deck: [makeCreature("deck_1")] });
    const before = controller.getVersion();

    expect(controller.drawCard().success).toBe(true);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getVersion()).toBe(before + 1);
  });

  it("notifies once when selecting a hand card", () => {
    const card = makeCreature("hand_1");
    const { controller, listener } = subscribed({ hands: [[card], []] });

    controller.clickHandCard(card);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies once for a click that calls other actions inside it", () => {
    const twin = makeCreature();
    const { controller, players, listener } = subscribed({ hands: [[twin], []] });
    controller.clickHandCard(twin);
    listener.mockClear();

    // clickField → playCard: still a single notification
    expect(controller.clickField(players[0], 0, 1)).toEqual({ success: true });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("also notifies after a failed action", () => {
    const { controller, listener } = subscribed();

    expect(controller.drawCard().success).toBe(false);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify for queries", () => {
    const { controller, players, listener } = subscribed();

    controller.canClickField(players[0], 0, 0);
    controller.canDrawCard();
    controller.isCardVisibleToPlayer(players[1].field[0][0]!, players[1]);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("isFaceUp", () => {
  it("reports whether a card is permanently face up", () => {
    const { controller, players } = createTestController();
    const card = players[0].field[0][0]!;

    expect(controller.isFaceUp(card)).toBe(false);
    card.reveal();
    expect(controller.isFaceUp(card)).toBe(true);
  });
});

describe("the viewer during the AI's turn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** The human (player 0) has ended their turn, and the AI (player 1) is "thinking" before it plays. */
  function duringAITurn() {
    const humanCard = makeCreature("human_hand");
    const aiCard = makeCreature("ai_hand", "chicken");
    const steal = makeAction("Bird_Army_1", "birdArmy");
    const discarded = makeCreature("in_discard", "chicken");
    const test = createTestController({
      deck: [makeCreature("deck_1")],
      hands: [[humanCard, steal], [aiCard]],
      turnCounts: [1, 0],
      player2IsAI: true,
    });
    test.game.discard(discarded);
    test.controller.drawCard();
    expect(test.controller.finishTurn().success).toBe(true);
    expect(test.game.currentPlayerIndex).toBe(1);
    return { ...test, humanCard, aiCard, steal, discarded };
  }

  it("keeps the human as the viewer while the AI is the current player", () => {
    const { controller, players } = duringAITurn();

    expect(controller.isHumanTurn()).toBe(false);
    expect(controller.getViewer()).toBe(players[0]);
  });

  it("hides the AI's hand and face-down field cards, and shows the human's own cards", () => {
    const { controller, players, humanCard, aiCard } = duringAITurn();
    const aiFieldCard = players[1].field[0][0]!;

    expect(controller.isCardVisibleToPlayer(aiCard, players[1])).toBe(false);
    expect(controller.isCardVisibleToPlayer(aiFieldCard, players[1])).toBe(false);
    expect(controller.isCardVisibleToPlayer(humanCard, players[0])).toBe(true);
  });

  it("refuses every click while the AI is thinking, and changes nothing", () => {
    const { controller, game, players, humanCard, aiCard, discarded } = duringAITurn();
    const refusal = { success: false, reason: "Wait for the AI to finish its turn" };

    // The AI's creature could attack on a human's turn: it must not be clickable now
    expect(controller.canClickField(players[1], 0, 0)).toBe(false);
    expect(controller.clickField(players[1], 0, 0)).toEqual(refusal);
    expect(controller.clickHandCard(humanCard)).toEqual(refusal);
    expect(controller.clickHandCard(aiCard)).toEqual(refusal);
    expect(controller.interactWithOpponentCard(players[1], aiCard)).toEqual(refusal);
    expect(controller.selectDiscardPileCard(discarded)).toEqual(refusal);
    expect(controller.drawCard().success).toBe(false);

    expect(controller.getSelectedCard()).toBeNull();
    expect(controller.getPendingAction()).toBeNull();
    expect(game.turn.movesThisTurn).toBe(0);

    // The AI still plays its own turn
    vi.advanceTimersByTime(controller.aiTurnDelayMs);
    expect(players[1].turnCount).toBe(1);
    expect(controller.isHumanTurn()).toBe(true);
  });
});

describe("the viewer otherwise", () => {
  it("is the current player in hot-seat, so each player sees their own hand on their turn", () => {
    const p0Card = makeCreature("p0_hand");
    const p1Card = makeCreature("p1_hand", "chicken");
    const { controller, players } = createTestController({ hands: [[p0Card], [p1Card]] });

    expect(controller.getViewer()).toBe(players[0]);
    expect(controller.isCardVisibleToPlayer(p0Card, players[0])).toBe(true);
    expect(controller.isCardVisibleToPlayer(p1Card, players[1])).toBe(false);

    controller.endTurn();

    expect(controller.isHumanTurn()).toBe(true);
    expect(controller.getViewer()).toBe(players[1]);
    expect(controller.isCardVisibleToPlayer(p1Card, players[1])).toBe(true);
    expect(controller.isCardVisibleToPlayer(p0Card, players[0])).toBe(false);
  });

  it("still lets the human see the AI's hand through Messy Dorm", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const aiCard = makeCreature("ai_hand", "chicken");
    const { controller, players } = createTestController({ hands: [[dorm], [aiCard]], player2IsAI: true });

    expect(controller.isCardVisibleToPlayer(aiCard, players[1])).toBe(false);
    expect(controller.clickHandCard(dorm).success).toBe(true);
    expect(controller.isCardVisibleToPlayer(aiCard, players[1])).toBe(true);
  });
});

describe("clickDeck", () => {
  it("draws for a human who owes a draw", () => {
    const drawn = makeCreature("deck_1");
    const { controller, players } = createTestController({ deck: [drawn] });

    expect(controller.canClickDeck()).toBe(true);
    expect(controller.clickDeck()).toEqual({ success: true });
    expect(players[0].hand).toEqual([drawn]);
    expect(controller.canClickDeck()).toBe(false);
  });

  it("refuses during the AI's turn and leaves the AI's hand and the deck alone", () => {
    const { controller, game, players } = createTestController({
      deck: [makeCreature("deck_1")],
      currentPlayerIndex: 1,
      player2IsAI: true,
    });

    expect(controller.canDrawCard()).toBe(true); // the AI itself may draw
    expect(controller.canClickDeck()).toBe(false);
    expect(controller.clickDeck()).toEqual({ success: false, reason: "Wait for the AI to finish its turn" });
    expect(players[1].hand).toEqual([]);
    expect(game.deck.size).toBe(1);
  });
});

describe("cards handed back by a view", () => {
  it("finds the real card by instanceId, so a copy of the same card works too", () => {
    const creature = makeCreature("copy_me");
    const { controller, players } = createTestController({ hands: [[creature], []] });
    const sameCard = { id: creature.id, name: creature.name, type: creature.type, instanceId: creature.instanceId, facedUp: false };

    expect(controller.clickHandCard(sameCard).success).toBe(true);
    expect(controller.clickField(players[0], -1, 0).success).toBe(true);
    expect(players[0].field[0][0]).toBe(creature);
  });

  it("refuses a card that is not in the hand", () => {
    const { controller } = createTestController({ hands: [[makeCreature("in_hand")], []] });
    const stranger = makeCreature("stranger");

    expect(controller.clickHandCard(stranger).success).toBe(false);
    expect(controller.getSelectedCard()).toBeNull();
  });
});

describe("getFieldClickKind", () => {
  /** Every cell a view can ask about on both fields: the placeholder rows above and below, and all 4 columns. */
  function allKinds(controller: ReturnType<typeof createTestController>["controller"], players: ReturnType<typeof createTestController>["players"]) {
    return players.flatMap(owner => {
      const kinds = [];
      for (let row = -1; row <= owner.field.length; row++) {
        for (let col = 0; col < 4; col++) kinds.push(controller.getFieldClickKind(owner, row, col));
      }
      return kinds;
    });
  }

  // Drift guard: each kind is asserted, then clickField on the same cell must do the matching thing
  it("startAttack: the click starts an attack with that creature", () => {
    const { controller, players } = createTestController();
    const attacker = players[0].field[0][0];

    expect(controller.getFieldClickKind(players[0], 0, 0)).toBe("startAttack");
    expect(controller.clickField(players[0], 0, 0)).toEqual({ success: true });

    expect(controller.getPendingAction()).toBe("attack");
    expect(controller.getSelectedCard()).toBe(attacker);
  });

  it("attackTarget: the click resolves the attack on that creature", () => {
    const { controller, players } = createTestController();
    controller.clickField(players[0], 0, 0);

    expect(controller.getFieldClickKind(players[1], 0, 0)).toBe("attackTarget");
    // The attacker's own cell does nothing mid-attack
    expect(controller.getFieldClickKind(players[0], 0, 0)).toBeNull();
    expect(controller.clickField(players[1], 0, 0)).toEqual({ success: true });

    // The Dog beats the Cat: the attack is over, the turn is spent, and the Cat's row is gone
    expect(controller.getPendingAction()).toBeNull();
    expect(controller.getMovesLeft()).toBe(0);
    expect(players[1].field).toEqual([]);
  });

  it("teaTarget: the click reveals that card and discards the Tea card", () => {
    const tea = makeAction("Power_of_Tea_1", "powerOfTea");
    const { controller, game, players } = createTestController({ hands: [[tea], []] });
    const target = players[1].field[0][0] as Card;
    controller.clickHandCard(tea);

    expect(controller.getFieldClickKind(players[1], 0, 0)).toBe("teaTarget");
    expect(controller.getFieldClickKind(players[0], 0, 0)).toBeNull();
    expect(controller.clickField(players[1], 0, 0)).toEqual({ success: true });

    expect(target.facedUp).toBe(true);
    expect(game.discardPile).toEqual([tea]);
  });

  it("place: the click puts the selected card in that cell", () => {
    const twin = makeCreature(); // matches the Dog at row 0, col 0
    const { controller, players } = createTestController({ hands: [[twin], []] });
    controller.clickHandCard(twin);

    expect(controller.getFieldClickKind(players[0], 0, 1)).toBe("place");
    expect(controller.getFieldClickKind(players[0], 0, 0)).toBeNull();
    expect(controller.getFieldClickKind(players[1], 0, 0)).toBeNull();
    expect(controller.clickField(players[0], 0, 1)).toEqual({ success: true });

    expect(players[0].field[0][1]).toBe(twin);
    expect(players[0].hand).toEqual([]);
  });

  it("null: the click does nothing", () => {
    const { controller, players } = createTestController();
    const before = players.map(p => p.field.map(row => [...row]));

    expect(controller.getFieldClickKind(players[1], 0, 0)).toBeNull();
    expect(controller.clickField(players[1], 0, 0)).toEqual({ success: false, reason: "Nothing to do here" });

    expect(players.map(p => p.field.map(row => [...row]))).toEqual(before);
    expect(controller.getMovesLeft()).toBe(2);
    expect(controller.getPendingAction()).toBeNull();
  });

  it("is null everywhere during the AI's turn", () => {
    const { controller, players } = createTestController({ player2IsAI: true, currentPlayerIndex: 1 });

    expect(allKinds(controller, players).every(kind => kind === null)).toBe(true);
  });

  it("is null everywhere while a steal, a revive or the discard phase is pending", () => {
    const steal = createTestController({ hands: [[makeAction("Bird_Army_1", "birdArmy")], [makeCreature("opp_card")]] });
    steal.controller.clickHandCard(steal.players[0].hand[0]);
    expect(steal.controller.getPendingAction()).toBe("stealCard");
    expect(allKinds(steal.controller, steal.players).every(kind => kind === null)).toBe(true);

    const revive = createTestController({ hands: [[makeAction("Forest_Spirits", "spirit")], []] });
    revive.game.discard(makeCreature("dead"));
    revive.controller.clickHandCard(revive.players[0].hand[0]);
    expect(revive.controller.getPendingAction()).toBe("creatureRevive");
    expect(allKinds(revive.controller, revive.players).every(kind => kind === null)).toBe(true);

    const discard = createTestController({ hands: [Array.from({ length: 6 }, (_, i) => makeCreature(`card_${i}`)), []] });
    expect(discard.controller.startDiscardPhase().success).toBe(true);
    expect(discard.controller.getPendingAction()).toBe("discardExtraCards");
    expect(allKinds(discard.controller, discard.players).every(kind => kind === null)).toBe(true);
  });
});

describe("isHandRevealed", () => {
  it("is true only while the viewer's Messy Dorm shows the opponent's hand", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const { controller, players } = createTestController({ hands: [[dorm], [makeCreature("opp_card")]] });

    expect(controller.isHandRevealed(players[1])).toBe(false);
    expect(controller.clickHandCard(dorm)).toEqual({ success: true });
    expect(controller.isHandRevealed(players[1])).toBe(true);
    // Never your own hand
    expect(controller.isHandRevealed(players[0])).toBe(false);

    // The reveal ends at the next move, here deselecting the Dorm
    expect(controller.clickHandCard(dorm)).toEqual({ success: true });
    expect(controller.isHandRevealed(players[1])).toBe(false);
  });

  it("stays true when Discard Extra replaces the pending action", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const others = Array.from({ length: 5 }, (_, i) => makeCreature(`card_${i}`));
    const { controller, players } = createTestController({ hands: [[dorm, ...others], [makeCreature("opp_card")]] });

    controller.clickHandCard(dorm);
    expect(controller.startDiscardPhase()).toEqual({ success: true });

    expect(controller.getPendingAction()).toBe("discardExtraCards");
    expect(controller.isHandRevealed(players[1])).toBe(true);
  });
});
