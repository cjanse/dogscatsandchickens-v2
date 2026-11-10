import { describe, it, expect } from "vitest";
import { GameController } from "../../controller/GameController";
import type { CardData } from "../../model/types/CardData";
import { createTestController, makeCreature } from "./helpers";

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
});
