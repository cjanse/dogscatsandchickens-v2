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

    expect(controller.clickHandCard(players[0], twin)).toEqual({ success: true });
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

  it("does not start an attack on a first turn", () => {
    const { controller, players } = createTestController({ turnCounts: [0, 0] });

    expect(controller.canClickField(players[0], 0, 0)).toBe(false);
    expect(controller.clickField(players[0], 0, 0).success).toBe(false);
    expect(controller.getPendingAction()).toBeNull();
  });

  it("does not start an attack before the player has drawn", () => {
    const { controller, players } = createTestController({ deck: [makeCreature("deck_1")] });

    expect(controller.canClickField(players[0], 0, 0)).toBe(false);

    controller.drawCard(players[0]);

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
    const { controller, players } = createTestController({ hands: [[first, second], []] });

    controller.clickHandCard(players[0], first);
    expect(controller.getSelectedCard()).toBe(first);

    controller.clickHandCard(players[0], second);
    expect(controller.getSelectedCard()).toBe(second);

    controller.clickHandCard(players[0], second);
    expect(controller.getSelectedCard()).toBeNull();
  });

  it("clears the selection when the turn ends", () => {
    const creature = makeCreature("held");
    const { controller, players } = createTestController({ hands: [[creature], []] });

    controller.clickHandCard(players[0], creature);
    controller.endTurn();

    expect(controller.getSelectedCard()).toBeNull();
  });

  it("does not select a card the player can't play", () => {
    const upgrade = makeUpgrade();
    const { controller, players } = createTestController({
      hands: [[upgrade], []],
      turnCounts: [0, 0], // only a creature may be played on a first turn
    });

    expect(controller.clickHandCard(players[0], upgrade).success).toBe(false);
    expect(controller.getSelectedCard()).toBeNull();
  });

  it("discards the clicked card during the discard phase", () => {
    const cards = Array.from({ length: 6 }, (_, i) => makeCreature(`card_${i}`));
    const { controller, game, players } = createTestController({ hands: [cards, []] });

    expect(controller.startDiscardPhase().success).toBe(true);
    expect(controller.clickHandCard(players[0], cards[0]).success).toBe(true);

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

    expect(controller.clickHandCard(players[0], tea).success).toBe(true);
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
});

describe("Messy Dorm and the selection", () => {
  it("discards the Dorm and charges one move when another card is selected", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const creature = makeCreature("held");
    const { controller, game, players } = createTestController({ hands: [[dorm, creature], []] });

    controller.clickHandCard(players[0], dorm);
    expect(controller.getSelectedCard()).toBe(dorm);
    expect(game.temporaryEffects).toHaveLength(1);

    controller.clickHandCard(players[0], creature);

    expect(controller.getSelectedCard()).toBe(creature);
    expect(game.temporaryEffects).toHaveLength(0);
    expect(game.discardPile).toEqual([dorm]);
    expect(controller.getMovesLeft()).toBe(1);
  });

  it("discards the Dorm and charges one move when it is deselected", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const { controller, game, players } = createTestController({ hands: [[dorm], []] });

    controller.clickHandCard(players[0], dorm);
    controller.clickHandCard(players[0], dorm);

    expect(controller.getSelectedCard()).toBeNull();
    expect(game.discardPile).toEqual([dorm]);
    expect(controller.getMovesLeft()).toBe(1);
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

    controller.clickHandCard(players[0], birdArmy);
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

    controller.clickHandCard(players[0], spirits);
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

    controller.clickHandCard(players[0], birdArmy);
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

    expect(controller.drawCard(players[0])).toEqual({ success: true });
    expect(controller.drawCard(players[0]).success).toBe(false);
    expect(players[0].hand).toHaveLength(1);
  });

  it("refuses a draw for the player who is not up", () => {
    const { controller, game, players } = createTestController({ deck: [makeCreature("deck_1")] });

    expect(controller.canDrawCard(players[1])).toBe(false);
    expect(controller.drawCard(players[1]).success).toBe(false);
    expect(players[1].hand).toEqual([]);
    expect(game.deck.size).toBe(1);
  });

  it("refuses a draw from an empty deck", () => {
    const { controller, players } = createTestController();

    expect(controller.drawCard(players[0]).success).toBe(false);
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
    controller.drawCard(players[0]);

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
    const { controller, players } = setupAgainstAI();
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.drawCard(players[0]);

    controller.finishTurn();
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(controller.aiTurnDelayMs);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops notifying a subscriber that unsubscribed", () => {
    const { controller, players } = setupAgainstAI();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.drawCard(players[0]);
    unsubscribe();

    controller.finishTurn();
    vi.advanceTimersByTime(controller.aiTurnDelayMs);

    expect(listener).not.toHaveBeenCalled();
  });

  it("cancels a pending AI turn on dispose", () => {
    const { controller, game, players } = setupAgainstAI();
    controller.drawCard(players[0]);
    controller.finishTurn();

    controller.dispose();
    vi.advanceTimersByTime(controller.aiTurnDelayMs * 10);

    expect(game.currentPlayerIndex).toBe(1);
    expect(players[1].turnCount).toBe(0);
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
