import { describe, it, expect } from "vitest";
import { GameController } from "../../controller/GameController";
import type { CardData } from "../../model/types/CardData";
import { CardFactory } from "../../model/cards/CardFactory";
import type { Card } from "../../model/cards/Card";
import type { ActionType } from "../../model/types/ActionType";
import { createTestController, makeCreature } from "./helpers";

function makeAction(id: string, actionType: ActionType): Card {
  return CardFactory.create({
    id,
    name: id,
    type: "action",
    actionType,
    front: "front.jpg",
    back: "action.jpg",
  });
}

const mockCards: Record<string, CardData> = {
  test1: {
    id: "test1",
    name: "Test Creature",
    type: "creature",
    creatureType: "dog",
    matchingAbilityType: "alwaysWin",
    front: "front.jpg",
    back: "back.jpg",
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

      controller.drawCard(0);

      expect(players[0].hand.length).toBe(1);
      expect(game.deck.size).toBe(2);
    });

    it("only allows one draw per turn", () => {
      const { controller, game, players } = createTestController({
        deck: [makeCreature(), makeCreature(), makeCreature()],
      });

      controller.drawCard(0);
      controller.drawCard(0);

      expect(players[0].hand.length).toBe(1);
      expect(game.deck.size).toBe(2);
    });

    it("does nothing when drawing from an empty deck", () => {
      const { controller, players } = createTestController();

      expect(controller.canDrawCard(0)).toBe(false);
      expect(() => controller.drawCard(0)).not.toThrow();
      expect(players[0].hand.length).toBe(0);
    });

    it("does not let a player draw on their first turn", () => {
      const { controller, players } = createTestController({
        deck: [makeCreature()],
        turnCounts: [0, 0],
      });

      controller.drawCard(0);

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
  });

  describe("move counting", () => {
    it("does not charge the next player a move when Messy Dorm is active at endTurn", () => {
      const dorm = makeAction("Messy_Dorm_1", "messyDorm");
      const { controller, game, players } = createTestController({
        hands: [[dorm], []],
      });

      expect(controller.playHandCard(players[0], dorm).success).toBe(true);
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

      controller.playHandCard(players[0], dorm);
      // Clearing the reveal costs 1 move and the creature costs another
      expect(controller.playCard(0, creature.instanceId, 0, 1).success).toBe(true);

      expect(controller.getMovesLeft()).toBe(0);
    });

    it("ignores a discard pile click when no card is selected", () => {
      const spirits = makeAction("Forest_Spirits", "spirit");
      const discarded = makeCreature("discarded_dog");
      const { controller, game, players } = createTestController({
        hands: [[spirits], []],
      });
      game.discard(discarded);

      controller.playHandCard(players[0], spirits);
      expect(controller.getPendingAction()).toBe("creatureRevive");

      const result = controller.selectDiscardPileCard(players[0], null, discarded);

      expect(result.success).toBe(false);
      expect(controller.getMovesLeft()).toBe(2);
      expect(controller.getPendingAction()).toBe("creatureRevive");
      expect(game.discardPile).toContain(discarded);
    });

    it("does not count a move when the discard pile card is the wrong type", () => {
      const spirits = makeAction("Forest_Spirits", "spirit");
      const wrongType = makeAction("Messy_Dorm_1", "messyDorm");
      const { controller, game, players } = createTestController({
        hands: [[spirits], []],
      });
      game.discard(makeCreature("discarded_dog"));
      game.discard(wrongType);

      controller.playHandCard(players[0], spirits);
      const result = controller.selectDiscardPileCard(players[0], spirits.instanceId, wrongType);

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

      controller.playHandCard(players[0], spirits);
      const result = controller.selectDiscardPileCard(players[0], spirits.instanceId, notDiscarded);

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

      controller.playHandCard(players[0], spirits);
      const result = controller.selectDiscardPileCard(players[0], spirits.instanceId, discarded);

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

      controller.playHandCard(players[0], birdArmy);
      expect(controller.getPendingAction()).toBe("stealCard");

      const result = controller.interactWithOpponentCard(players[1], birdArmy.instanceId, opponentCard);

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

      controller.playHandCard(players[0], birdArmy);
      const result = controller.interactWithOpponentCard(players[1], birdArmy.instanceId, stealable);

      expect(result.success).toBe(true);
      expect(controller.getMovesLeft()).toBe(1);
      expect(players[0].hand).toContain(stealable);
      expect(game.discardPile).toContain(birdArmy);
    });
  });
});
