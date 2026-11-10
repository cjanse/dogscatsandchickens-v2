import { describe, it, expect } from "vitest";
import type { CreatureCard } from "../../model/cards/CreatureCard";
import { createTestController, makeCreature, makeUpgrade } from "./helpers";

/**
 * Player 0's Dog (row 0, col 0) attacks player 1's creature at row 0, col 0.
 * `defenderUpgrades` go into player 1's row 0 starting at col 2 (col 3 triggers first).
 */
function setupAttack(defenderUpgrades: ReturnType<typeof makeUpgrade>[], defender = makeCreature("def_cat", "cat")) {
  const attacker = makeCreature("att_dog", "dog");
  const setup = createTestController({ fields: [[attacker], [defender]] });
  defenderUpgrades.forEach((upgrade, i) => {
    setup.players[1].field[0][2 + i] = upgrade;
  });
  expect(setup.controller.startAttack(0, 0).success).toBe(true);
  return { ...setup, attacker, defender };
}

function attack(controller: ReturnType<typeof setupAttack>["controller"]) {
  expect(controller.resolveAttack(0, 0).success).toBe(true);
}

describe("Fake Upgrade", () => {
  it("returns to its owner's hand when it is the only upgrade, and the creature is defeated", () => {
    const fake = makeUpgrade("fake_1", "fakeUpgrade");
    const { controller, game, players, defender } = setupAttack([fake]);
    fake.facedUp = true;

    attack(controller);

    expect(players[1].hand).toEqual([fake]);
    expect(fake.facedUp).toBe(false);
    expect(game.discardPile).not.toContain(fake);
    expect(game.discardPile).toContain(defender);
    expect(players[1].field[0].every(c => c === null)).toBe(true);
  });

  it("returns to hand and then lets the upgrade underneath trigger", () => {
    const defense = makeUpgrade("defense_1", "defense");
    const fake = makeUpgrade("fake_1", "fakeUpgrade");
    const { controller, game, players, defender } = setupAttack([defense, fake]);

    attack(controller);

    expect(players[1].hand).toEqual([fake]);
    expect(game.discardPile).toEqual([defense]);
    expect(players[1].field[0][0]).toBe(defender);
  });

  it("does not trigger when it sits under a Defense: it stays on the field", () => {
    const fake = makeUpgrade("fake_1", "fakeUpgrade");
    const defense = makeUpgrade("defense_1", "defense");
    const { controller, game, players, defender } = setupAttack([fake, defense]);

    attack(controller);

    expect(players[1].field[0][0]).toBe(defender);
    expect(players[1].field[0][2]).toBe(fake);
    expect(players[1].hand).toEqual([]);
    expect(game.discardPile).toEqual([defense]);
  });

  it("two Fake Upgrades both return to hand and the creature is defeated", () => {
    const fakeBottom = makeUpgrade("fake_1", "fakeUpgrade");
    const fakeTop = makeUpgrade("fake_2", "fakeUpgrade");
    const { controller, game, players, defender } = setupAttack([fakeBottom, fakeTop]);

    attack(controller);

    expect(players[1].hand).toHaveLength(2);
    expect(players[1].hand).toContain(fakeBottom);
    expect(players[1].hand).toContain(fakeTop);
    expect(game.discardPile).toEqual([defender]);
  });

  it("is discarded, not returned, when a Revive is underneath it", () => {
    const revive = makeUpgrade("revive_1", "revive");
    const fake = makeUpgrade("fake_1", "fakeUpgrade");
    const { controller, game, players, defender } = setupAttack([revive, fake]);

    attack(controller);

    expect(players[1].hand).toEqual([defender]);
    expect(game.discardPile).toHaveLength(2);
    expect(game.discardPile).toContain(fake);
    expect(game.discardPile).toContain(revive);
    expect(players[1].field[0].every(c => c === null)).toBe(true);
  });

  it("is discarded, not returned, when it is underneath a Revive", () => {
    const fake = makeUpgrade("fake_1", "fakeUpgrade");
    const revive = makeUpgrade("revive_1", "revive");
    const { controller, game, players, defender } = setupAttack([fake, revive]);

    attack(controller);

    expect(players[1].hand).toEqual([defender]);
    expect(game.discardPile).toHaveLength(2);
    expect(game.discardPile).toContain(fake);
    expect(game.discardPile).toContain(revive);
    expect(players[1].field[0].every(c => c === null)).toBe(true);
  });

  it("is discarded, not returned, when a Self-Destruct is underneath it", () => {
    const selfDestruct = makeUpgrade("sd_1", "selfDestruct");
    const fake = makeUpgrade("fake_1", "fakeUpgrade");
    const { controller, game, players, attacker, defender } = setupAttack([selfDestruct, fake]);

    attack(controller);

    expect(players[1].hand).toEqual([]);
    expect(game.discardPile).toContain(fake);
    expect(game.discardPile).toContain(selfDestruct);
    expect(game.discardPile).toContain(defender);
    expect(game.discardPile).toContain(attacker);
  });

  it("is discarded when the creature carrying it attacks and loses", () => {
    const fake = makeUpgrade("fake_1", "fakeUpgrade");
    const attacker = makeCreature("att_dog", "dog");
    const { controller, game, players } = createTestController({
      fields: [[attacker], [makeCreature("def_chicken", "chicken")]],
    });
    players[0].field[0][2] = fake;

    expect(controller.startAttack(0, 0).success).toBe(true);
    attack(controller);

    expect(players[0].hand).toEqual([]);
    expect(game.discardPile).toContain(fake);
    expect(game.discardPile).toContain(attacker);
  });
});

describe("cards leaving the field", () => {
  it("resets matched and facedUp on a matched pair that Revive sends back to hand", () => {
    const left = makeCreature("def_cat", "cat");
    const right = makeCreature("def_cat", "cat");
    const revive = makeUpgrade("revive_1", "revive");
    const { controller, players } = setupAttack([revive], left);
    players[1].field[0][1] = right;
    [left, right].forEach(c => {
      c.matched = true;
      c.facedUp = true;
    });

    attack(controller);

    expect(players[1].hand).toEqual(expect.arrayContaining([left, right]));
    for (const card of [left, right] as CreatureCard[]) {
      expect(card.matched).toBe(false);
      expect(card.facedUp).toBe(false);
    }
  });

  it("resets matched and facedUp on a matched pair that is discarded", () => {
    const left = makeCreature("def_cat", "cat");
    const right = makeCreature("def_cat", "cat");
    const { controller, game, players } = setupAttack([], left);
    players[1].field[0][1] = right;
    [left, right].forEach(c => {
      c.matched = true;
      c.facedUp = true;
    });

    attack(controller);

    expect(game.discardPile).toEqual(expect.arrayContaining([left, right]));
    for (const card of [left, right] as CreatureCard[]) {
      expect(card.matched).toBe(false);
      expect(card.facedUp).toBe(false);
    }
  });

  it("resets a matched attacker that loses the fight", () => {
    const attacker = makeCreature("att_dog", "dog");
    attacker.matched = true;
    const { controller, game } = createTestController({
      fields: [[attacker], [makeCreature("def_chicken", "chicken")]],
    });

    controller.startAttack(0, 0);
    attack(controller);

    expect(game.discardPile).toContain(attacker);
    expect(attacker.matched).toBe(false);
    expect(attacker.facedUp).toBe(false);
  });
});
