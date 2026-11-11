import { describe, it, expect } from "vitest";
import {
  allCreaturesSameType,
  lossResult,
  playerHasCreatures,
  tieResult,
  winResult,
} from "../../model/rules/GameEnd";
import type { CreatureCard } from "../../model/cards/CreatureCard";
import { createTestController, makeAction, makeCreature } from "../controller/helpers";

describe("playerHasCreatures", () => {
  it("is true with a creature on the field and false with an empty field", () => {
    const { players } = createTestController({ fields: [[makeCreature()], []] });
    expect(playerHasCreatures(players[0])).toBe(true);
    expect(playerHasCreatures(players[1])).toBe(false);
  });

  it("ignores creatures in the hand", () => {
    const { players } = createTestController({ hands: [[makeCreature("in_hand")], []], fields: [[], []] });
    expect(playerHasCreatures(players[0])).toBe(false);
  });
});

describe("allCreaturesSameType", () => {
  it("compares the creatures on both fields", () => {
    const same = createTestController({ fields: [[makeCreature()], [makeCreature("other_dog", "dog")]] });
    expect(allCreaturesSameType(same.game)).toBe(true);

    const mixed = createTestController({ fields: [[makeCreature()], [makeCreature("cat", "cat")]] });
    expect(allCreaturesSameType(mixed.game)).toBe(false);
  });

  it("is true when nobody has a creature", () => {
    const { game } = createTestController({ fields: [[], []] });
    expect(allCreaturesSameType(game)).toBe(true);
  });
});

describe("lossResult", () => {
  it("is a loss for a player with no creatures, and ongoing otherwise", () => {
    const { players } = createTestController({ fields: [[], [makeCreature()]] });
    expect(lossResult(players[0])).toEqual({ state: "loss", loserId: 0 });
    expect(lossResult(players[1])).toEqual({ state: "ongoing" });
  });
});

describe("winResult", () => {
  it("is a win when the opponent has no creatures on the field or in hand", () => {
    const { game, players } = createTestController({
      fields: [[makeCreature()], []],
      hands: [[], [makeAction("birds", "birdArmy")]],
    });
    expect(winResult(game, players[0])).toEqual({ state: "win", winnerId: 0 });
  });

  it("is ongoing while the opponent still has a creature in hand", () => {
    const { game, players } = createTestController({
      fields: [[makeCreature()], []],
      hands: [[], [makeCreature("in_hand")]],
    });
    expect(winResult(game, players[0])).toEqual({ state: "ongoing" });
  });

  it("is ongoing while the opponent still has a creature on the field", () => {
    const { game, players } = createTestController({ fields: [[makeCreature()], [makeCreature("cat", "cat")]] });
    expect(winResult(game, players[0])).toEqual({ state: "ongoing" });
  });

  it("names the player who is checked as the winner", () => {
    const { game, players } = createTestController({ fields: [[], [makeCreature("cat", "cat")]] });
    expect(winResult(game, players[1])).toEqual({ state: "win", winnerId: 1 });
  });
});

describe("tieResult", () => {
  const sameType = () =>
    [[makeCreature()], [makeCreature("other_dog", "dog")]] as [CreatureCard[], CreatureCard[]];

  it("is a tie with an empty deck, one creature type and nothing playable", () => {
    // Bird Army can't be played against an empty hand
    const { game } = createTestController({ fields: sameType(), hands: [[makeAction("birds", "birdArmy")], []] });
    expect(tieResult(game)).toEqual({ state: "tie" });
  });

  it("is ongoing while the deck still has cards", () => {
    const { game } = createTestController({ fields: sameType(), deck: [makeCreature("deck_1")] });
    expect(tieResult(game)).toEqual({ state: "ongoing" });
  });

  it("is ongoing while the creatures differ in type", () => {
    const { game } = createTestController({ fields: [[makeCreature()], [makeCreature("cat", "cat")]] });
    expect(tieResult(game)).toEqual({ state: "ongoing" });
  });

  it("is ongoing while either player can still play a card, whoever's turn it is", () => {
    // Player 0 is up and holds nothing playable; player 1 still holds a creature
    const { game } = createTestController({
      fields: sameType(),
      hands: [[makeAction("birds", "birdArmy")], [makeCreature("playable")]],
    });
    expect(game.currentPlayerIndex).toBe(0);
    expect(tieResult(game)).toEqual({ state: "ongoing" });
  });

  it("counts an action that can still act as playable", () => {
    // The opponent's creatures are face down, so Power of Tea can still be played
    const { game } = createTestController({ fields: sameType(), hands: [[makeAction("tea", "powerOfTea")], []] });
    expect(tieResult(game)).toEqual({ state: "ongoing" });
  });
});
