import { describe, it, expect, beforeEach } from "vitest";
import { GameController } from "../../controller/GameController";
import type { CardData } from "../../model/types/CardData";

const mockCards: Record<string, CardData> = {
  test1: {
    id: "test1",
    name: "Test Creature",
    type: "creature",
    creatureType: "dog",
    matchingAbilityType: "alwaysWin",
    front: "front.jpg",
    back: "back.jpg"
  }
};

const mockDeck = {
  test1: 3
};

describe("GameController", () => {
  let controller: GameController;

  beforeEach(() => {
    controller = new GameController(mockCards, mockDeck);
  });

  it("initializes a game with two players", () => {
    const game = controller.getGameState();

    expect(game.players.length).toBe(2);
    expect(game.deck.size).toBe(3);
  });

    it("allows a player to draw a card", () => {
    const game = controller.getGameState();
    const player = game.players[0];

    expect(player.hand.length).toBe(0);

    controller.drawCard(0);

    expect(player.hand.length).toBe(1);
    expect(game.deck.size).toBe(2);
  });

    it("switches turns correctly", () => {
    const game = controller.getGameState();

    expect(game.currentPlayerIndex).toBe(0);

    controller.endTurn();

    expect(game.currentPlayerIndex).toBe(1);
  });

    it("does nothing when drawing from an empty deck", () => {
    controller.drawCard(0);
    controller.drawCard(0);
    controller.drawCard(0);

    const game = controller.getGameState();
    expect(game.deck.size).toBe(0);

    controller.drawCard(0); // should not throw

    expect(game.players[0].hand.length).toBe(3);
  });
});

