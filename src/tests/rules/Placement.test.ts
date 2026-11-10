import { describe, it, expect } from "vitest";
import { Player } from "../../model/game/Player";
import { canPlaceCreature, canPlaceUpgrade, hasUpgradeSlot } from "../../model/rules/Placement";
import { canAttackAgain } from "../../model/rules/Matching";
import { makeCreature, makeUpgrade } from "../controller/helpers";

describe("canPlaceCreature", () => {
  it("allows an empty creature slot in col 0 or 1", () => {
    const player = new Player(0, 1);
    const card = makeCreature("bella", "cat");
    expect(canPlaceCreature(player, card, 0, 0)).toBe(true);
    expect(canPlaceCreature(player, card, 0, 1)).toBe(true);
    expect(canPlaceCreature(player, card, 0, 2)).toBe(false);
  });

  it("only allows the creature's own twin next to it", () => {
    const player = new Player(0, 1);
    player.field[0][0] = makeCreature("bella", "cat");
    expect(canPlaceCreature(player, makeCreature("bella", "cat"), 0, 1)).toBe(true);
    expect(canPlaceCreature(player, makeCreature("pounce", "cat"), 0, 1)).toBe(false);
    expect(canPlaceCreature(player, makeCreature("bella", "cat"), 0, 0)).toBe(false);
  });
});

describe("canPlaceCreature in a new row", () => {
  const card = makeCreature("bella", "cat");

  it("allows only row 0 on an empty field", () => {
    const player = new Player(0);
    expect(canPlaceCreature(player, card, 0, 0)).toBe(true);
    expect(canPlaceCreature(player, card, -1, 0)).toBe(false);
    expect(canPlaceCreature(player, card, 1, 0)).toBe(false);
  });

  it("allows a new row above (-1) and below (field.length) existing rows", () => {
    const player = new Player(0, 1);
    player.field[0][0] = makeCreature("pounce", "cat");
    expect(canPlaceCreature(player, card, -1, 0)).toBe(true);
    expect(canPlaceCreature(player, card, 1, 1)).toBe(true);
    expect(canPlaceCreature(player, card, -2, 0)).toBe(false);
    expect(canPlaceCreature(player, card, 2, 0)).toBe(false);
    expect(canPlaceCreature(player, card, 1, 2)).toBe(false);
  });
});

describe("canPlaceUpgrade", () => {
  it("never opens a new row", () => {
    const player = new Player(0, 1);
    player.field[0][0] = makeCreature();
    expect(canPlaceUpgrade(player, -1, 2)).toBe(false);
    expect(canPlaceUpgrade(player, 1, 2)).toBe(false);
  });

  it("needs a creature in the row, and fills col 2 before col 3", () => {
    const player = new Player(0, 1);
    expect(canPlaceUpgrade(player, 0, 2)).toBe(false);

    player.field[0][0] = makeCreature();
    expect(canPlaceUpgrade(player, 0, 2)).toBe(true);
    expect(canPlaceUpgrade(player, 0, 3)).toBe(false);
    expect(canPlaceUpgrade(player, 0, 1)).toBe(false);

    player.field[0][2] = makeUpgrade();
    expect(canPlaceUpgrade(player, 0, 2)).toBe(false);
    expect(canPlaceUpgrade(player, 0, 3)).toBe(true);
    expect(canPlaceUpgrade(player, 5, 2)).toBe(false);
  });
});

describe("hasUpgradeSlot", () => {
  it("is true while some creature has fewer than 2 upgrades", () => {
    const player = new Player(0, 1);
    expect(hasUpgradeSlot(player)).toBe(false);

    player.field[0][0] = makeCreature();
    expect(hasUpgradeSlot(player)).toBe(true);

    player.field[0][2] = makeUpgrade();
    player.field[0][3] = makeUpgrade();
    expect(hasUpgradeSlot(player)).toBe(false);
  });
});

describe("canAttackAgain", () => {
  it("is only true for a matched Cat", () => {
    const cat = makeCreature("bella", "cat");
    expect(canAttackAgain(cat)).toBe(false);
    cat.matched = true;
    expect(canAttackAgain(cat)).toBe(true);

    const dog = makeCreature();
    dog.matched = true;
    expect(canAttackAgain(dog)).toBe(false);
  });
});
