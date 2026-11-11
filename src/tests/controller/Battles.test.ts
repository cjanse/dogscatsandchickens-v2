import { describe, it, expect } from "vitest";
import type { Card } from "../../model/cards/Card";
import type { CreatureType } from "../../model/types/CreatureType";
import { createTestController, makeCreature, makeUpgrade, matchPair } from "./helpers";

/**
 * Player 0's creature (row 0, col 0) attacks player 1's creature (row 0, col 0).
 * Pass `matchedAttacker` to fill col 1 with a matched twin. The pair starts face down (not yet activated).
 */
function setupBattle(attackerType: CreatureType, defenderType: CreatureType, opts: { matchedAttacker?: boolean } = {}) {
  const attacker = makeCreature(`att_${attackerType}`, attackerType);
  const defender = makeCreature(`def_${defenderType}`, defenderType);
  const attackerRow: Card[] = [attacker];
  if (opts.matchedAttacker) {
    const twin = makeCreature(`att_${attackerType}`, attackerType);
    matchPair(attacker, twin, { active: false });
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
    expect(players[1].field).toEqual([]);
    expect(players[0].field[0][0]).toBe(attacker);
    expect(attacker.facedUp).toBe(true);
  });

  it("defeats the attacker, and its upgrades, when the defender's type wins", () => {
    const { controller, game, players, attacker, defender } = setupBattle("dog", "chicken");
    const defense = makeUpgrade("defense_1", "defense");
    players[0].field[0][2] = defense;

    attack(controller);

    expect(game.discardPile).toEqual([attacker, defense]);
    expect(players[0].field).toEqual([]);
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

  it("removes the row of a defeated creature, so the field holds no empty rows", () => {
    const { controller, game, players, defender } = setupBattle("dog", "cat");
    const neighbour = makeCreature("neighbour", "chicken");
    // Put the defender in a middle row
    players[1].field = [
      [neighbour, null, null, null],
      [defender, null, null, null],
      [neighbour, null, null, null],
    ];

    attack(controller, 1);

    expect(game.discardPile).toEqual([defender]);
    expect(players[1].field).toEqual([
      [neighbour, null, null, null],
      [neighbour, null, null, null],
    ]);
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
    expect(players[0].field).toEqual([]);
    expect(players[1].field).toEqual([]);
  });
});

describe("matching abilities", () => {
  it("lets a face-down matched Cat attack again: its first attack flips and activates it", () => {
    const { controller, players } = setupBattle("cat", "cat", { matchedAttacker: true });

    attack(controller);

    expect(players[0].field[0][1]!.facedUp).toBe(true);
    expect(controller.canAttackWith(0, 0)).toBe(true);
  });

  it("an attack flips both cards of a face-down pair", () => {
    const { controller, players, attacker } = setupBattle("cat", "chicken", { matchedAttacker: true });
    const twin = players[0].field[0][1]!;

    attack(controller);

    expect(attacker.facedUp).toBe(true);
    expect(twin.facedUp).toBe(true);
  });

  it("a face-down matched Dog wins against a Dog: the attack flips it before the fight", () => {
    const { controller, game, defender } = setupBattle("dog", "dog", { matchedAttacker: true });

    attack(controller);

    expect(game.discardPile).toContain(defender);
  });

  it("a face-down matched Chicken that gets attacked flips the attacker's field", () => {
    const attacker = makeCreature("att_cat", "cat");
    const attackerUpgrade = makeUpgrade("defense_1", "defense");
    const bottom = makeCreature("lulu", "chicken", "seeEverything");
    const top = makeCreature("lulu", "chicken", "seeEverything");
    matchPair(bottom, top, { active: false });
    const { controller, game, players } = createTestController({ fields: [[attacker], [bottom, top]] });
    players[0].field[0][2] = attackerUpgrade;

    attack(controller);

    expect(attackerUpgrade.facedUp).toBe(true);
    // The Cat still beats the Chicken: the flip happens before the fight, the pair is then defeated
    expect(game.discardPile).toEqual(expect.arrayContaining([bottom, top]));
  });

  it("does not let an unmatched creature attack again", () => {
    const { controller } = setupBattle("cat", "cat");

    attack(controller);

    expect(controller.canAttackWith(0, 0)).toBe(false);
  });

  it("matching a Chicken keeps the pair face down; activating it reveals every card on the opponent's field", () => {
    const bottom = makeCreature("lulu", "chicken", "seeEverything");
    const top = makeCreature("lulu", "chicken", "seeEverything");
    const opponentCreature = makeCreature("def_cat", "cat");
    const opponentUpgrade = makeUpgrade("defense_1", "defense");
    const { controller, players } = createTestController({
      hands: [[top], []],
      fields: [[bottom], [opponentCreature]],
    });
    players[1].field[0][2] = opponentUpgrade;

    expect(controller.playCard(players[0], top, 0, 1).success).toBe(true);

    expect(bottom.matched).toBe(true);
    expect(top.matched).toBe(true);
    expect(top.facedUp).toBe(false);
    expect(opponentCreature.facedUp).toBe(false);
    expect(controller.getMovesLeft()).toBe(1);

    expect(controller.activatePair(0).success).toBe(true);

    expect(bottom.facedUp).toBe(true);
    expect(top.facedUp).toBe(true);
    expect(players[1].field.flat().filter(c => c !== null).every(c => c!.facedUp)).toBe(true);
    // Activation is free
    expect(controller.getMovesLeft()).toBe(1);
  });

  it("matching onto a face-up creature activates the pair at once", () => {
    const bottom = makeCreature("lulu", "chicken", "seeEverything");
    const top = makeCreature("lulu", "chicken", "seeEverything");
    const opponentCreature = makeCreature("def_cat", "cat");
    const { controller, players } = createTestController({
      hands: [[top], []],
      fields: [[bottom], [opponentCreature]],
    });
    bottom.reveal();

    expect(controller.playCard(players[0], top, 0, 1).success).toBe(true);

    expect(top.facedUp).toBe(true);
    expect(opponentCreature.facedUp).toBe(true);
    expect(controller.canActivatePair(0)).toBe(false);
  });

  it("records a win only at End Turn, after an attack defeats the opponent's last creature", () => {
    const { controller } = setupBattle("dog", "cat");

    attack(controller);
    expect(controller.getGameResult()).toEqual({ state: "ongoing" });

    controller.endTurn();
    expect(controller.getGameResult()).toEqual({ state: "win", winnerId: 0 });
  });

  it("does not record a win at End Turn while the opponent holds a creature in hand", () => {
    const attacker = makeCreature("att_dog", "dog");
    const { controller } = createTestController({
      fields: [[attacker], [makeCreature("def_cat", "cat")]],
      hands: [[], [makeCreature("spare", "chicken")]],
    });

    attack(controller);
    controller.endTurn();

    expect(controller.getGameResult()).toEqual({ state: "ongoing" });
  });
});
