import { describe, it, expect } from "vitest";
import { GameController } from "../../controller/GameController";
import type { CardData } from "../../model/types/CardData";
import { createTestController, makeAction, makeCreature, makeUpgrade } from "./helpers";

const mockCards: Record<string, CardData> = {
  test1: {
    id: "test1",
    name: "Test Creature",
    type: "creature",
    creatureType: "dog",
    matchingAbilityType: "alwaysWin",
  },
};

describe("GameController", () => {
  describe("opening deal", () => {
    it("creates two players and deals 5 cards to each", () => {
      const controller = new GameController(mockCards, { test1: 20 });
      const game = controller.getGameState();

      expect(game.players.length).toBe(2);
      expect(game.players[0].hand.length).toBe(5);
      expect(game.players[1].hand.length).toBe(5);
      expect(game.deck.size).toBe(10);
    });
  });

  describe("drawing", () => {
    it("lets the current player draw a card", () => {
      const { controller, game, players } = createTestController({
        deck: [makeCreature(), makeCreature(), makeCreature()],
      });

      expect(players[0].hand.length).toBe(0);

      controller.drawCard();

      expect(players[0].hand.length).toBe(1);
      expect(game.deck.size).toBe(2);
    });

    it("only allows one draw per turn", () => {
      const { controller, game, players } = createTestController({
        deck: [makeCreature(), makeCreature(), makeCreature()],
      });

      controller.drawCard();
      controller.drawCard();

      expect(players[0].hand.length).toBe(1);
      expect(game.deck.size).toBe(2);
    });

    it("does nothing when drawing from an empty deck", () => {
      const { controller, players } = createTestController();

      expect(controller.canDrawCard()).toBe(false);
      expect(() => controller.drawCard()).not.toThrow();
      expect(players[0].hand.length).toBe(0);
    });

    it("does not let a player draw on their first turn", () => {
      const { controller, players } = createTestController({
        deck: [makeCreature()],
        turnCounts: [0, 0],
      });

      controller.drawCard();

      expect(players[0].hand.length).toBe(0);
    });
  });

  describe("turn order", () => {
    it("switches to the other player on endTurn", () => {
      const { controller, game } = createTestController();

      expect(game.currentPlayerIndex).toBe(0);

      controller.endTurn();

      expect(game.currentPlayerIndex).toBe(1);
    });

    it("gives each player one move on their first turn, then two", () => {
      const { controller } = createTestController({ turnCounts: [0, 0] });

      expect(controller.getMovesLeft()).toBe(1);

      controller.endTurn(); // player 1's first turn
      expect(controller.getMovesLeft()).toBe(1);

      controller.endTurn(); // player 0's second turn
      expect(controller.getMovesLeft()).toBe(2);
    });

    it("ends the game as a loss when the player ending their turn has no creatures", () => {
      const { controller, game } = createTestController({ fields: [[], [makeCreature()]] });

      controller.endTurn();

      expect(controller.getGameResult()).toEqual({ state: "loss", loserId: 0 });
      // Turn does not advance once the game is over
      expect(game.currentPlayerIndex).toBe(0);
    });

    it("ends the game as a win when the opponent has no creatures on the field or in hand", () => {
      const { controller, game } = createTestController({ fields: [[makeCreature()], []] });

      controller.endTurn();

      expect(controller.getGameResult()).toEqual({ state: "win", winnerId: 0 });
      expect(game.currentPlayerIndex).toBe(0);
    });

    it("does not end the game while the opponent still has a creature in hand", () => {
      const { controller, game } = createTestController({
        fields: [[makeCreature()], []],
        hands: [[], [makeCreature("in_hand")]],
      });

      controller.endTurn();

      expect(controller.getGameResult()).toEqual({ state: "ongoing" });
      expect(game.currentPlayerIndex).toBe(1);
    });

    it("counts a loss, not a win, when neither player has creatures on the field", () => {
      const { controller } = createTestController({ fields: [[], []] });

      controller.endTurn();

      expect(controller.getGameResult()).toEqual({ state: "loss", loserId: 0 });
    });
  });

  describe("move counting", () => {
    it("does not charge the next player a move when Messy Dorm is active at endTurn", () => {
      const dorm = makeAction("Messy_Dorm_1", "messyDorm");
      const { controller, game } = createTestController({
        hands: [[dorm], []],
      });

      expect(controller.selectHandCard(dorm).success).toBe(true);
      expect(game.temporaryEffects.length).toBe(1);

      controller.endTurn();

      expect(game.currentPlayerIndex).toBe(1);
      expect(game.temporaryEffects.length).toBe(0);
      expect(controller.getMovesLeft()).toBe(2);
      expect(controller.canAttackWith(0, 0)).toBe(true);
    });

    it("still charges one move for Messy Dorm when the player keeps playing", () => {
      const dorm = makeAction("Messy_Dorm_1", "messyDorm");
      const creature = makeCreature(); // matching twin of the creature already at row 0, col 0
      const { controller, players } = createTestController({
        hands: [[dorm, creature], []],
      });

      controller.selectHandCard(dorm);
      // Clearing the reveal costs 1 move and the creature costs another
      expect(controller.playCard(players[0], creature, 0, 1).success).toBe(true);

      expect(controller.getMovesLeft()).toBe(0);
    });

    it("ignores a discard pile click when no card is selected", () => {
      const spirits = makeAction("Forest_Spirits", "spirit");
      const discarded = makeCreature("discarded_dog");
      const { controller, game, players } = createTestController({
        hands: [[spirits], []],
      });
      game.discard(discarded);

      // Spirits is in hand but was never selected, so no revive is pending
      const result = controller.selectDiscardPileCard(discarded);

      expect(result.success).toBe(false);
      expect(controller.getMovesLeft()).toBe(2);
      expect(game.discardPile).toContain(discarded);
      expect(players[0].hand).toEqual([spirits]);
    });

    it("does not count a move when the discard pile card is the wrong type", () => {
      const spirits = makeAction("Forest_Spirits", "spirit");
      const wrongType = makeAction("Messy_Dorm_1", "messyDorm");
      const { controller, game } = createTestController({
        hands: [[spirits], []],
      });
      game.discard(makeCreature("discarded_dog"));
      game.discard(wrongType);

      controller.selectHandCard(spirits);
      const result = controller.selectDiscardPileCard(wrongType);

      expect(result.success).toBe(false);
      expect(controller.getMovesLeft()).toBe(2);
      expect(controller.getPendingAction()).toBe("creatureRevive");
    });

    it("rejects a revive target that is not in the discard pile", () => {
      const spirits = makeAction("Forest_Spirits", "spirit");
      const lastDiscarded = makeCreature("discarded_dog");
      const notDiscarded = makeCreature("elsewhere_dog");
      const { controller, game, players } = createTestController({
        hands: [[spirits], []],
      });
      game.discard(lastDiscarded);

      controller.selectHandCard(spirits);
      const result = controller.selectDiscardPileCard(notDiscarded);

      expect(result.success).toBe(false);
      expect(controller.getMovesLeft()).toBe(2);
      // The last card in the pile must not be taken by mistake
      expect(game.discardPile).toEqual([lastDiscarded]);
      expect(players[0].hand).toEqual([spirits]);
    });

    it("counts exactly one move for a successful revive", () => {
      const spirits = makeAction("Forest_Spirits", "spirit");
      const discarded = makeCreature("discarded_dog");
      const { controller, game, players } = createTestController({
        hands: [[spirits], []],
      });
      game.discard(discarded);

      controller.selectHandCard(spirits);
      const result = controller.selectDiscardPileCard(discarded);

      expect(result.success).toBe(true);
      expect(controller.getMovesLeft()).toBe(1);
      expect(players[0].hand).toContain(discarded);
      expect(game.discardPile).toContain(spirits);
    });

    it("does not count a move or lose the pending steal when there is nothing to steal", () => {
      const birdArmy = makeAction("Bird_Army_1", "birdArmy");
      const opponentCard = makeCreature("opp_card");
      // The opponent's hand is empty, so the clicked card is not really stealable
      const { controller, players } = createTestController({
        hands: [[birdArmy], [makeAction("Messy_Dorm_1", "messyDorm")]],
      });

      controller.selectHandCard(birdArmy);
      expect(controller.getPendingAction()).toBe("stealCard");

      const result = controller.interactWithOpponentCard(players[1], opponentCard);

      expect(result.success).toBe(false);
      expect(controller.getMovesLeft()).toBe(2);
      expect(controller.getPendingAction()).toBe("stealCard");
      expect(players[0].hand).toContain(birdArmy);
    });

    it("counts exactly one move for a successful steal", () => {
      const birdArmy = makeAction("Bird_Army_1", "birdArmy");
      const stealable = makeCreature("opp_card");
      const { controller, game, players } = createTestController({
        hands: [[birdArmy], [stealable]],
      });

      controller.selectHandCard(birdArmy);
      const result = controller.interactWithOpponentCard(players[1], stealable);

      expect(result.success).toBe(true);
      expect(controller.getMovesLeft()).toBe(1);
      expect(players[0].hand).toContain(stealable);
      expect(game.discardPile).toContain(birdArmy);
    });
  });

  describe("turn flow", () => {
    it("lets a recovering player draw once a creature is on the field", () => {
      const creature = makeCreature("hand_dog");
      const { controller, game, players } = createTestController({
        deck: [makeCreature("deck_1"), makeCreature("deck_2")],
        hands: [[creature], []],
        fields: [[], [makeCreature()]],
      });

      // No creature on the field: no draw is owed yet, so moves are allowed
      expect(controller.canDrawCard()).toBe(false);
      expect(controller.mustDrawFirst()).toBe(false);

      expect(controller.playCard(players[0], creature, 0, 0).success).toBe(true);

      expect(controller.canDrawCard()).toBe(true);
      controller.drawCard();
      expect(players[0].hand.length).toBe(1);
      expect(game.deck.size).toBe(1);
    });

    it("lets a recovering player draw after using both moves, and blocks End Turn until then", () => {
      const spirits = makeAction("Forest_Spirits", "spirit");
      const discarded = makeCreature("discarded_dog");
      const { controller, game, players } = createTestController({
        deck: [makeCreature("deck_1")],
        hands: [[spirits], []],
        fields: [[], [makeCreature()]],
      });
      game.discard(discarded);

      controller.selectHandCard(spirits);
      expect(controller.selectDiscardPileCard(discarded).success).toBe(true);
      expect(controller.playCard(players[0], discarded, 0, 0).success).toBe(true);
      expect(controller.getMovesLeft()).toBe(0);

      const blocked = controller.endTurn();
      expect(blocked).toEqual({ success: false, reason: "You must draw first" });
      expect(game.currentPlayerIndex).toBe(0);

      expect(controller.canDrawCard()).toBe(true);
      controller.drawCard();
      expect(game.deck.size).toBe(0);

      expect(controller.endTurn().success).toBe(true);
      expect(game.currentPlayerIndex).toBe(1);
    });

    it("blocks every move until the player has drawn", () => {
      const twin = makeCreature(); // matches the creature at row 0, col 0
      const { controller, players } = createTestController({
        deck: [makeCreature("deck_1")],
        hands: [[twin], []],
      });

      expect(controller.mustDrawFirst()).toBe(true);
      expect(controller.canPlayHandCard(players[0], twin)).toBe(false);
      expect(controller.canPlayCard(players[0], twin, 0, 1)).toBe(false);
      expect(controller.playCard(players[0], twin, 0, 1).success).toBe(false);
      expect(controller.canAttackWith(0, 0)).toBe(false);
      expect(controller.startAttack(0, 0)).toEqual({ success: false, reason: "You must draw first" });
      expect(controller.canEndTurn()).toBe(false);

      controller.drawCard();

      expect(controller.mustDrawFirst()).toBe(false);
      expect(controller.canAttackWith(0, 0)).toBe(true);
      expect(controller.canEndTurn()).toBe(true);
      expect(controller.playCard(players[0], twin, 0, 1).success).toBe(true);
    });

    it("does not require a draw when the deck is empty", () => {
      const twin = makeCreature();
      const { controller, players } = createTestController({ hands: [[twin], []] });

      expect(controller.mustDrawFirst()).toBe(false);
      expect(controller.canPlayHandCard(players[0], twin)).toBe(true);
      expect(controller.canAttackWith(0, 0)).toBe(true);
    });

    it("only allows a creature to be played on a player's first turn", () => {
      const dorm = makeAction("Messy_Dorm_1", "messyDorm");
      const upgrade = makeUpgrade();
      const twin = makeCreature();
      const { controller, players } = createTestController({
        deck: [makeCreature("deck_1")],
        hands: [[dorm, upgrade, twin], []],
        turnCounts: [0, 0],
      });

      // No draw on the first turn, so nothing is owed
      expect(controller.mustDrawFirst()).toBe(false);

      expect(controller.canPlayHandCard(players[0], dorm)).toBe(false);
      expect(controller.selectHandCard(dorm).success).toBe(false);
      expect(controller.canPlayHandCard(players[0], upgrade)).toBe(false);
      expect(controller.canPlayCard(players[0], upgrade, 0, 2)).toBe(false);
      expect(controller.canAttackWith(0, 0)).toBe(false);
      expect(controller.startAttack(0, 0).success).toBe(false);

      expect(controller.canPlayHandCard(players[0], twin)).toBe(true);
      expect(controller.playCard(players[0], twin, 0, 1).success).toBe(true);
    });
  });

  describe("hand limit", () => {
    const sixCards = () => Array.from({ length: 6 }, (_, i) => makeCreature(`card_${i}`));

    it("blocks End Turn while the hand is over the limit", () => {
      const cards = sixCards();
      const { controller, game } = createTestController({ hands: [cards, []] });

      expect(controller.canEndTurn()).toBe(false);
      expect(controller.canFinishTurn()).toBe(false);
      expect(controller.endTurn()).toEqual({ success: false, reason: "Discard down to 5 cards first" });
      expect(controller.finishTurn().success).toBe(false);
      expect(game.currentPlayerIndex).toBe(0);
    });

    it("lets the turn end once the player has discarded down to the limit", () => {
      const cards = sixCards();
      const { controller, game, players } = createTestController({ hands: [cards, []] });

      expect(controller.startDiscardPhase().success).toBe(true);
      expect(controller.discardHandCard(cards[0]).success).toBe(true);

      expect(players[0].hand).toHaveLength(5);
      expect(controller.canEndTurn()).toBe(true);
      expect(controller.endTurn().success).toBe(true);
      expect(game.currentPlayerIndex).toBe(1);
    });

    it("offers Discard Extra only while over the limit and not yet discarding", () => {
      const cards = sixCards();
      const { controller } = createTestController({ hands: [cards, []] });

      expect(controller.canStartDiscardPhase()).toBe(true);
      controller.startDiscardPhase();
      expect(controller.canStartDiscardPhase()).toBe(false);
      controller.discardHandCard(cards[0]);
      expect(controller.canStartDiscardPhase()).toBe(false);
    });

    it("does not offer Discard Extra within the limit or during the AI's turn", () => {
      const { controller } = createTestController({ hands: [[makeCreature("a")], []] });
      expect(controller.canStartDiscardPhase()).toBe(false);

      const ai = createTestController({ hands: [[], sixCards()], currentPlayerIndex: 1, player2IsAI: true });
      expect(ai.controller.canStartDiscardPhase()).toBe(false);
    });
  });
});
