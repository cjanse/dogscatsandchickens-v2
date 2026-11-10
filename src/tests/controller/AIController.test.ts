import { describe, it, expect } from "vitest";
import { AIController } from "../../controller/AIController";
import type { Player } from "../../model/game/Player";
import { createTestController, makeAction, makeCreature, makeUpgrade } from "./helpers";

function fieldCreatures(player: Player) {
  return player.field.flat().filter(card => card?.type === "creature");
}

describe("AIController", () => {
  it("only places a creature on its first turn", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const upgrade = makeUpgrade();
    const creature = makeCreature("ai_cat", "cat");
    const { controller, game, players } = createTestController({
      deck: [makeCreature("deck_1")],
      hands: [[], [dorm, upgrade, creature]],
      fields: [[makeCreature()], []],
      currentPlayerIndex: 1,
      turnCounts: [1, 0],
      player2IsAI: true,
    });

    new AIController(controller).executeAITurn();

    expect(fieldCreatures(players[1])).toEqual([creature]);
    expect(players[1].hand).toEqual([dorm, upgrade]);
    // No draw on the first turn
    expect(game.deck.size).toBe(1);
  });

  it("draws after a recovery move puts a creature on the field", () => {
    const creature = makeCreature("ai_cat", "cat");
    const { controller, game, players } = createTestController({
      deck: [makeCreature("deck_1"), makeCreature("deck_2")],
      hands: [[], [creature]],
      fields: [[makeCreature()], []],
      currentPlayerIndex: 1,
      player2IsAI: true,
    });

    new AIController(controller).executeAITurn();

    expect(fieldCreatures(players[1])).toContain(creature);
    expect(game.deck.size).toBe(1);
    expect(controller.canEndTurn()).toBe(true);
  });

  it("draws at the start of a normal turn", () => {
    const { controller, game } = createTestController({
      deck: [makeCreature("deck_1")],
      currentPlayerIndex: 1,
      player2IsAI: true,
    });

    new AIController(controller).executeAITurn();

    expect(game.deck.size).toBe(0);
    expect(controller.canEndTurn()).toBe(true);
  });
});
