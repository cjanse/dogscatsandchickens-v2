import { describe, it, expect } from "vitest";
import {
  activatePair,
  canActivatePair,
  canAttackAgain,
  formPair,
  isAbilityActive,
  pairAbility,
  revealCreature,
} from "../../model/rules/Matching";
import { createTestController, makeCreature, makeUpgrade, matchPair } from "../controller/helpers";

const chicken = () => makeCreature("lulu", "chicken", "seeEverything");
const cat = () => makeCreature("bella", "cat", "multipleAttacks");

/** Player 0 has `bottom` and `top` side by side in row 0 (as if `top` was just played), player 1 a Dog with an upgrade. */
function setupPair(bottom = chicken(), top = chicken()) {
  const opponentCreature = makeCreature("rex", "dog");
  const opponentUpgrade = makeUpgrade();
  const setup = createTestController({ fields: [[bottom, top], [opponentCreature]] });
  setup.players[1].field[0][2] = opponentUpgrade;
  return { ...setup, bottom, top, opponentCreature, opponentUpgrade };
}

describe("formPair", () => {
  it("pairs the twins but keeps them face down while the bottom card is face down", () => {
    const { game, players, bottom, top, opponentCreature, opponentUpgrade } = setupPair();

    formPair(game, players[0], { card: top, twin: bottom });

    expect(bottom.matched).toBe(true);
    expect(top.matched).toBe(true);
    expect(bottom.facedUp).toBe(false);
    expect(top.facedUp).toBe(false);
    // The Chicken's flip waits for activation
    expect(opponentCreature.facedUp).toBe(false);
    expect(opponentUpgrade.facedUp).toBe(false);
  });

  it("activates the pair at once when the bottom card was already face up", () => {
    const { game, players, bottom, top, opponentCreature, opponentUpgrade } = setupPair();
    bottom.reveal();

    formPair(game, players[0], { card: top, twin: bottom });

    expect(top.facedUp).toBe(true);
    expect(isAbilityActive(top)).toBe(true);
    expect(opponentCreature.facedUp).toBe(true);
    expect(opponentUpgrade.facedUp).toBe(true);
  });
});

describe("canActivatePair", () => {
  it("is true only for a matched pair that is still face down", () => {
    const { players, bottom, top } = setupPair();
    expect(canActivatePair(players[0], 0)).toBe(false); // twins, but not paired yet

    matchPair(bottom, top, { active: false });
    expect(canActivatePair(players[0], 0)).toBe(true);

    matchPair(bottom, top, { active: true });
    expect(canActivatePair(players[0], 0)).toBe(false);
  });

  it("is false for a single creature and for a row that doesn't exist", () => {
    const { players } = createTestController();
    expect(canActivatePair(players[0], 0)).toBe(false);
    expect(canActivatePair(players[0], 3)).toBe(false);
    expect(canActivatePair(players[0], -1)).toBe(false);
  });
});

describe("activatePair", () => {
  it("flips both cards and runs the Chicken's flip of the opponent's field", () => {
    const { game, players, bottom, top, opponentCreature, opponentUpgrade } = setupPair();
    matchPair(bottom, top, { active: false });

    expect(activatePair(game, players[0], 0)).toBe(true);

    expect(bottom.facedUp).toBe(true);
    expect(top.facedUp).toBe(true);
    expect(opponentCreature.facedUp).toBe(true);
    expect(opponentUpgrade.facedUp).toBe(true);
  });

  it("runs only once", () => {
    const { game, players, bottom, top } = setupPair();
    matchPair(bottom, top, { active: false });
    activatePair(game, players[0], 0);

    const later = makeCreature("later", "cat");
    players[1].field.push([later, null, null, null]);

    expect(activatePair(game, players[0], 0)).toBe(false);
    expect(later.facedUp).toBe(false);
  });

  it("does nothing without a face-down pair", () => {
    const { game, players } = createTestController();
    expect(activatePair(game, players[0], 0)).toBe(false);
    expect(players[0].field[0][0]!.facedUp).toBe(false);
  });

  it("a Chicken's flip activates a hidden Chicken pair on the other side, which flips this field back, and stops", () => {
    const { game, players, bottom, top } = setupPair();
    matchPair(bottom, top, { active: false });
    const myOtherCreature = makeCreature("rex", "dog");
    players[0].field.push([myOtherCreature, null, null, null]);

    const theirBottom = makeCreature("olive", "chicken", "seeEverything");
    const theirTop = makeCreature("olive", "chicken", "seeEverything");
    matchPair(theirBottom, theirTop, { active: false });
    players[1].field.push([theirBottom, theirTop, null, null]);

    activatePair(game, players[0], 0);

    expect(isAbilityActive(theirBottom)).toBe(true);
    expect(isAbilityActive(theirTop)).toBe(true);
    // Their Chicken flipped this field
    expect(myOtherCreature.facedUp).toBe(true);
    expect(players.every(p => p.field.flat().every(card => card === null || card.facedUp))).toBe(true);
  });
});

describe("revealCreature", () => {
  it("flips a single creature", () => {
    const { game, players } = createTestController();
    revealCreature(game, players[0], 0);
    expect(players[0].field[0][0]!.facedUp).toBe(true);
  });

  it("flips both cards of a hidden pair and activates it", () => {
    const { game, players, bottom, top, opponentCreature } = setupPair();
    matchPair(bottom, top, { active: false });

    revealCreature(game, players[0], 0);

    expect(isAbilityActive(bottom)).toBe(true);
    expect(isAbilityActive(top)).toBe(true);
    expect(opponentCreature.facedUp).toBe(true);
  });

  it("leaves the upgrades alone", () => {
    const { game, players } = createTestController();
    const upgrade = makeUpgrade();
    players[0].field[0][2] = upgrade;

    revealCreature(game, players[0], 0);

    expect(upgrade.facedUp).toBe(false);
  });
});

describe("pairAbility", () => {
  it("is the pair's ability, face down or not, and null without a pair", () => {
    const { players, bottom, top } = setupPair();
    expect(pairAbility(players[0], 0)).toBeNull(); // twins, but not paired yet

    matchPair(bottom, top, { active: false });
    expect(pairAbility(players[0], 0)).toBe("seeEverything");

    expect(pairAbility(players[1], 0)).toBeNull(); // a single creature
    expect(pairAbility(players[0], 5)).toBeNull();
  });
});

describe("isAbilityActive and canAttackAgain", () => {
  it("an ability is only active while the pair is face up", () => {
    const a = cat();
    const b = cat();
    expect(isAbilityActive(a)).toBe(false);
    matchPair(a, b, { active: false });
    expect(isAbilityActive(a)).toBe(false);
    a.reveal();
    b.reveal();
    expect(isAbilityActive(a)).toBe(true);
  });

  it("only an active matched Cat may attack again", () => {
    const hidden = cat();
    matchPair(hidden, cat(), { active: false });
    expect(canAttackAgain(hidden)).toBe(false);

    const active = cat();
    matchPair(active, cat(), { active: true });
    expect(canAttackAgain(active)).toBe(true);

    const faceUpSingle = cat();
    faceUpSingle.reveal();
    expect(canAttackAgain(faceUpSingle)).toBe(false);

    const dog = makeCreature();
    matchPair(dog, makeCreature(), { active: true });
    expect(canAttackAgain(dog)).toBe(false);
  });
});
