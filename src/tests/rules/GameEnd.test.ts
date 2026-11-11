import { describe, it, expect } from "vitest";
import {
  allCreaturesSameType,
  lossResult,
  playerHasCreatures,
  tieResult,
} from "../../model/rules/GameEnd";
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

describe("tieResult", () => {
  const sameType = [[makeCreature()], [makeCreature("other_dog", "dog")]] as [
    ReturnType<typeof makeCreature>[],
    ReturnType<typeof makeCreature>[],
  ];

  it("is a tie with an empty deck, one creature type and nothing playable", () => {
    const { game } = createTestController({ fields: sameType, hands: [[makeAction("tea", "powerOfTea")], []] });
    expect(tieResult(game, () => false)).toEqual({ state: "tie" });
  });

  it("is ongoing while the deck still has cards", () => {
    const { game } = createTestController({ fields: sameType, deck: [makeCreature("deck_1")] });
    expect(tieResult(game, () => false)).toEqual({ state: "ongoing" });
  });

  it("is ongoing while the creatures differ in type", () => {
    const { game } = createTestController({ fields: [[makeCreature()], [makeCreature("cat", "cat")]] });
    expect(tieResult(game, () => false)).toEqual({ state: "ongoing" });
  });

  it("is ongoing while someone can play a card, and asks about every card in every hand", () => {
    const playable = makeCreature("playable");
    const { game, players } = createTestController({ fields: sameType, hands: [[], [playable]] });
    const asked: string[] = [];

    const result = tieResult(game, (player, card) => {
      asked.push(`${player.id}:${card.id}`);
      return card === playable;
    });

    expect(result).toEqual({ state: "ongoing" });
    expect(asked).toEqual([`${players[1].id}:playable`]);
  });
});
