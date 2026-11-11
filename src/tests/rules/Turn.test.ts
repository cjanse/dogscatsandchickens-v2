import { describe, it, expect } from "vitest";
import { canDraw, canStartAttack, firstTurnAllows, isFirstTurn } from "../../model/rules/Turn";
import type { CreatureCard } from "../../model/cards/CreatureCard";
import { createTestController, makeAction, makeCreature, makeUpgrade, matchPair } from "../controller/helpers";

describe("isFirstTurn and firstTurnAllows", () => {
  it("only allows a creature on a player's first turn", () => {
    const { players } = createTestController({ turnCounts: [0, 1] });

    expect(isFirstTurn(players[0])).toBe(true);
    expect(firstTurnAllows(players[0], makeCreature("c"))).toBe(true);
    expect(firstTurnAllows(players[0], makeUpgrade())).toBe(false);
    expect(firstTurnAllows(players[0], makeAction("Messy_Dorm_1", "messyDorm"))).toBe(false);
  });

  it("allows any card after the first turn", () => {
    const { players } = createTestController();

    expect(isFirstTurn(players[0])).toBe(false);
    expect(firstTurnAllows(players[0], makeUpgrade())).toBe(true);
    expect(firstTurnAllows(players[0], makeAction("Messy_Dorm_1", "messyDorm"))).toBe(true);
  });
});

describe("canDraw", () => {
  it("allows one draw per turn from a non-empty deck", () => {
    const { game } = createTestController({ deck: [makeCreature("d1"), makeCreature("d2")] });

    expect(canDraw(game)).toBe(true);
    game.turn.markDrawn();
    expect(canDraw(game)).toBe(false);
  });

  it("refuses with an empty deck", () => {
    const { game } = createTestController({ deck: [] });
    expect(canDraw(game)).toBe(false);
  });

  it("refuses on a first turn", () => {
    const { game } = createTestController({ deck: [makeCreature("d1")], turnCounts: [0, 1] });
    expect(canDraw(game)).toBe(false);
  });

  it("waits for a creature on the field during a recovery turn", () => {
    const { game } = createTestController({ deck: [makeCreature("d1")], fields: [[], [makeCreature("cat", "cat")]] });
    expect(canDraw(game)).toBe(false);
  });
});

describe("canStartAttack", () => {
  it("allows an attack only as the first move of the turn", () => {
    const { game, players } = createTestController();
    const attacker = players[0].field[0][0] as CreatureCard;

    expect(canStartAttack(game, attacker, 0)).toBe(true);
    game.turn.useMove();
    expect(canStartAttack(game, attacker, 0)).toBe(false);
  });

  it("refuses on a first turn", () => {
    const { game, players } = createTestController({ turnCounts: [0, 1] });
    expect(canStartAttack(game, players[0].field[0][0] as CreatureCard, 0)).toBe(false);
  });

  it("lets only the matched Cat that attacked attack again, from either card of its pair", () => {
    const cat = makeCreature("twin_cat", "cat", "multipleAttacks");
    const catTwin = makeCreature("twin_cat", "cat", "multipleAttacks");
    const otherCat = makeCreature("other_cat", "cat", "multipleAttacks");
    const otherTwin = makeCreature("other_cat", "cat", "multipleAttacks");
    const dog = makeCreature("dog");
    const { game } = createTestController();
    matchPair(cat, catTwin, { active: true });
    matchPair(otherCat, otherTwin, { active: true });

    game.turn.beginAttack({ card: cat, row: 0, col: 0 });
    game.turn.useAllMoves(game.maxMovesPerTurn);
    game.turn.finishAttack(0);

    expect(canStartAttack(game, cat, 0)).toBe(true);
    expect(canStartAttack(game, catTwin, 0)).toBe(true);
    expect(canStartAttack(game, otherCat, 1)).toBe(false);
    expect(canStartAttack(game, dog, 2)).toBe(false);
  });

  it("allows no extra attack when the attacker is not an active matched Cat", () => {
    const dog = makeCreature("dog");
    const { game } = createTestController();

    game.turn.beginAttack({ card: dog, row: 0, col: 0 });
    game.turn.useAllMoves(game.maxMovesPerTurn);
    game.turn.finishAttack(null);

    expect(canStartAttack(game, dog, 0)).toBe(false);
  });
});
