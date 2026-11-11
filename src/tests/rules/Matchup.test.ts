import { describe, it, expect } from "vitest";
import { attackerWins, defenderWins, typeBeats } from "../../model/rules/Matchup";
import type { CreatureType } from "../../model/types/CreatureType";
import { makeCreature, matchPair } from "../controller/helpers";

describe("typeBeats", () => {
  const cases: [CreatureType, CreatureType, boolean][] = [
    ["dog", "cat", true],
    ["cat", "chicken", true],
    ["chicken", "dog", true],
    ["cat", "dog", false],
    ["chicken", "cat", false],
    ["dog", "chicken", false],
    ["dog", "dog", false],
    ["cat", "cat", false],
    ["chicken", "chicken", false],
  ];

  for (const [a, b, expected] of cases) {
    it(`${a} vs ${b}: ${expected}`, () => {
      expect(typeBeats(a, b)).toBe(expected);
    });
  }
});

describe("attackerWins / defenderWins", () => {
  it("follow the type circle", () => {
    expect(attackerWins(makeCreature("d", "dog"), makeCreature("c", "cat"))).toBe(true);
    expect(defenderWins(makeCreature("d", "dog"), makeCreature("c", "cat"))).toBe(false);
    expect(attackerWins(makeCreature("d", "dog"), makeCreature("h", "chicken"))).toBe(false);
    expect(defenderWins(makeCreature("d", "dog"), makeCreature("h", "chicken"))).toBe(true);
  });

  it("give an active matched Dog the win against another Dog only", () => {
    const matchedDog = makeCreature("d", "dog");
    matchPair(matchedDog, makeCreature("d", "dog"), { active: true });
    expect(attackerWins(makeCreature("d", "dog"), makeCreature("d2", "dog"))).toBe(false);
    expect(attackerWins(matchedDog, makeCreature("d2", "dog"))).toBe(true);
    expect(attackerWins(matchedDog, makeCreature("h", "chicken"))).toBe(false);
  });

  it("give a face-down matched Dog no extra win: the ability is off until the pair is face up", () => {
    const hiddenDog = makeCreature("d", "dog");
    matchPair(hiddenDog, makeCreature("d", "dog"), { active: false });
    expect(attackerWins(hiddenDog, makeCreature("d2", "dog"))).toBe(false);
  });
});
