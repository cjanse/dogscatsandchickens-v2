import { describe, it, expect } from "vitest";
import { createTestController, makeCreature, makeUpgrade } from "./helpers";

describe("playing into new field rows", () => {
  it("lets a player with an empty field play a creature into row 0", () => {
    const creature = makeCreature("recovering_dog");
    const { controller, players } = createTestController({
      deck: [makeCreature("deck_1")],
      hands: [[creature], []],
      fields: [[], [makeCreature("test_cat", "cat")]],
    });
    expect(players[0].field).toEqual([]);

    expect(controller.canPlayCard(0, creature.instanceId, 0, 0)).toBe(true);
    expect(controller.playCard(0, creature.instanceId, 0, 0)).toEqual({ success: true });

    expect(players[0].field).toEqual([[creature, null, null, null]]);
  });

  it("opens a new row above (-1) or below (field.length) an existing row", () => {
    const above = makeCreature("above");
    const below = makeCreature("below");
    const { controller, players } = createTestController({
      hands: [[above, below], []],
    });
    const existing = players[0].field[0][0];

    expect(controller.playCard(0, above.instanceId, -1, 0)).toEqual({ success: true });
    expect(controller.playCard(0, below.instanceId, 2, 0)).toEqual({ success: true });

    expect(players[0].field.map(row => row[0])).toEqual([above, existing, below]);
  });

  it("does not let an upgrade open a new row", () => {
    const upgrade = makeUpgrade();
    const { controller, players } = createTestController({ hands: [[upgrade], []] });

    expect(controller.canPlayCard(0, upgrade.instanceId, -1, 2)).toBe(false);
    expect(controller.canPlayCard(0, upgrade.instanceId, 1, 2)).toBe(false);
    expect(controller.playCard(0, upgrade.instanceId, 1, 2).success).toBe(false);
    expect(players[0].field).toHaveLength(1);
  });

  it("rejects a row that is not next to the existing rows", () => {
    const creature = makeCreature("far_away");
    const { controller } = createTestController({ hands: [[creature], []] });

    expect(controller.canPlayCard(0, creature.instanceId, 5, 0)).toBe(false);
    expect(controller.canPlayCard(0, creature.instanceId, -2, 0)).toBe(false);
  });
});
