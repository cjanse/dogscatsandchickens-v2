import { describe, it, expect } from "vitest";
import type { Card } from "../../model/cards/Card";
import type { CreatureType } from "../../model/types/CreatureType";
import { createTestController, makeCreature, makeUpgrade } from "./helpers";

/**
 * Player 0's creature (row 0, col 0) attacks player 1's creature (row 0, col 0).
 * Pass a pair to fill col 1 with a matched twin.
 */
function setupBattle(attackerType: CreatureType, defenderType: CreatureType, opts: { matchedAttacker?: boolean } = {}) {
  const attacker = makeCreature(`att_${attackerType}`, attackerType);
  const defender = makeCreature(`def_${defenderType}`, defenderType);
  const attackerRow: Card[] = [attacker];
  if (opts.matchedAttacker) {
    const twin = makeCreature(`att_${attackerType}`, attackerType);
    attacker.matched = true;
    twin.matched = true;
    attackerRow.push(twin);
  }
  const setup = createTestController({ fields: [attackerRow, [defender]] });
  return { ...setup, attacker, defender };
}

function attack(controller: ReturnType<typeof setupBattle>["controller"], targetRow = 0) {
  expect(controller.startAttack(0, 0).success).toBe(true);
  expect(controller.resolveAttack(targetRow, 0).success).toBe(true);
}

describe("battles", () => {
  it("defeats the defender when the attacker's type wins", () => {
    const { controller, game, players, attacker, defender } = setupBattle("dog", "cat");

    attack(controller);

    expect(game.discardPile).toEqual([defender]);
    expect(players[1].field[0].every(c => c === null)).toBe(true);
    expect(players[0].field[0][0]).toBe(attacker);
    expect(attacker.facedUp).toBe(true);
  });

  it("defeats the attacker, and its upgrades, when the defender's type wins", () => {
    const { controller, game, players, attacker, defender } = setupBattle("dog", "chicken");
    const defense = makeUpgrade("defense_1", "defense");
    players[0].field[0][2] = defense;

    attack(controller);

    expect(game.discardPile).toEqual([attacker, defense]);
    expect(players[0].field[0].every(c => c === null)).toBe(true);
    expect(players[1].field[0][0]).toBe(defender);
    expect(defender.facedUp).toBe(true);
  });

  it("does nothing on the same type, apart from revealing both", () => {
    const { controller, game, players, attacker, defender } = setupBattle("cat", "cat");

    attack(controller);

    expect(game.discardPile).toEqual([]);
    expect(players[0].field[0][0]).toBe(attacker);
    expect(players[1].field[0][0]).toBe(defender);
    expect(attacker.facedUp).toBe(true);
    expect(defender.facedUp).toBe(true);
  });

  it("lets a matched Dog defeat another Dog", () => {
    const { controller, game, defender } = setupBattle("dog", "dog", { matchedAttacker: true });

    attack(controller);

    expect(game.discardPile).toEqual([defender]);
  });

  it("still defeats a matched Dog that attacks a Chicken", () => {
    const { controller, game, attacker } = setupBattle("dog", "chicken", { matchedAttacker: true });

    attack(controller);

    expect(game.discardPile).toContain(attacker);
    expect(game.discardPile).toHaveLength(2);
  });

  it("removes a defeated middle row but keeps an edge row as an empty row", () => {
    const { controller, game, players, defender } = setupBattle("dog", "cat");
    // Put the defender in a middle row
    players[1].field = [
      [null, null, null, null],
      [defender, null, null, null],
      [null, null, null, null],
    ];

    attack(controller, 1);

    expect(game.discardPile).toEqual([defender]);
    expect(players[1].field).toHaveLength(2);
  });
});

describe("upgrades that save the defender", () => {
  for (const upgradeType of ["defense", "counterAttack"] as const) {
    it(`${upgradeType} saves the creature and is discarded`, () => {
      const { controller, game, players, attacker, defender } = setupBattle("dog", "cat");
      const upgrade = makeUpgrade("upgrade_1", upgradeType);
      players[1].field[0][2] = upgrade;

      attack(controller);

      expect(game.discardPile).toEqual([upgrade]);
      expect(players[1].field[0][0]).toBe(defender);
      expect(players[1].field[0][2]).toBeNull();
      expect(players[0].field[0][0]).toBe(attacker);
    });
  }

  it("Self-Destruct takes the attacker down with the defender", () => {
    const { controller, game, players, attacker, defender } = setupBattle("dog", "cat");
    const selfDestruct = makeUpgrade("sd_1", "selfDestruct");
    players[1].field[0][2] = selfDestruct;

    attack(controller);

    expect(game.discardPile).toEqual(expect.arrayContaining([attacker, defender, selfDestruct]));
    expect(game.discardPile).toHaveLength(3);
    expect(players[0].field[0].every(c => c === null)).toBe(true);
    expect(players[1].field[0].every(c => c === null)).toBe(true);
  });
});

describe("matching abilities", () => {
  it("lets a matched Cat attack again", () => {
    const { controller } = setupBattle("cat", "cat", { matchedAttacker: true });

    attack(controller);

    expect(controller.canAttackWith(0, 0)).toBe(true);
  });

  it("does not let an unmatched creature attack again", () => {
    const { controller } = setupBattle("cat", "cat");

    attack(controller);

    expect(controller.canAttackWith(0, 0)).toBe(false);
  });

  it("matching a Chicken reveals every card on the opponent's field", () => {
    const bottom = makeCreature("lulu", "chicken", "seeEverything");
    const top = makeCreature("lulu", "chicken", "seeEverything");
    const opponentCreature = makeCreature("def_cat", "cat");
    const opponentUpgrade = makeUpgrade("defense_1", "defense");
    const { controller, players } = createTestController({
      hands: [[top], []],
      fields: [[bottom], [opponentCreature]],
    });
    players[1].field[0][2] = opponentUpgrade;

    expect(controller.playCard(0, top.instanceId, 0, 1).success).toBe(true);

    expect(bottom.matched).toBe(true);
    expect(top.matched).toBe(true);
    expect(opponentCreature.facedUp).toBe(true);
    expect(opponentUpgrade.facedUp).toBe(true);
    expect(players[1].field.flat().filter(c => c !== null).every(c => c!.facedUp)).toBe(true);
  });
});
