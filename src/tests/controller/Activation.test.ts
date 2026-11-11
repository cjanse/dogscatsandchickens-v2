import { describe, it, expect } from "vitest";
import { createTestController, makeCreature, matchPair, type TestGameSetup } from "./helpers";

const lulu = () => makeCreature("lulu", "chicken", "seeEverything");

/** Player 0 has a face-down matched Chicken pair in row 0, player 1 a face-down Dog. */
function setupHiddenPair(setup: TestGameSetup = {}) {
  const bottom = lulu();
  const top = lulu();
  matchPair(bottom, top, { active: false });
  const opponentCreature = makeCreature("rex", "dog");
  const test = createTestController({ fields: [[bottom, top], [opponentCreature]], ...setup });
  return { ...test, bottom, top, opponentCreature };
}

describe("activating a matched pair", () => {
  it("flips the pair, runs its ability and uses no move", () => {
    const { controller, bottom, top, opponentCreature } = setupHiddenPair();
    expect(controller.canActivatePair(0)).toBe(true);

    expect(controller.activatePair(0).success).toBe(true);

    expect(bottom.facedUp).toBe(true);
    expect(top.facedUp).toBe(true);
    expect(opponentCreature.facedUp).toBe(true);
    expect(controller.getMovesLeft()).toBe(2);
    expect(controller.canActivatePair(0)).toBe(false);
  });

  it("works with no moves left", () => {
    const { controller, game } = setupHiddenPair();
    game.turn.useAllMoves(game.maxMovesPerTurn);

    expect(controller.activatePair(0).success).toBe(true);
  });

  it("waits for the draw", () => {
    const { controller } = setupHiddenPair({ deck: [makeCreature("deck_1")] });
    expect(controller.canActivatePair(0)).toBe(false);
    expect(controller.activatePair(0).success).toBe(false);

    controller.drawCard();

    expect(controller.canActivatePair(0)).toBe(true);
  });

  it("is refused once the game is over", () => {
    const { controller, game } = setupHiddenPair();
    game.endGame({ state: "tie" });
    expect(controller.canActivatePair(0)).toBe(false);
    expect(controller.activatePair(0).success).toBe(false);
  });

  it("is refused for a row without a hidden pair", () => {
    const { controller } = createTestController();
    expect(controller.canActivatePair(0)).toBe(false);
    expect(controller.activatePair(0).success).toBe(false);
  });

  it("keeps the selected hand card", () => {
    const creature = makeCreature("hand_cat", "cat");
    const { controller, players } = setupHiddenPair({ hands: [[creature], []] });
    controller.clickHandCard(creature);

    expect(controller.clickActivate(players[0], 0).success).toBe(true);

    expect(controller.getSelectedCard()).toBe(creature);
  });

  it("notifies listeners", () => {
    const { controller } = setupHiddenPair();
    const before = controller.getVersion();
    controller.activatePair(0);
    expect(controller.getVersion()).toBe(before + 1);
  });

  it("is what a pair formed by playing the twin waits for", () => {
    const bottom = lulu();
    const top = lulu();
    const { controller, players } = createTestController({
      hands: [[top], []],
      fields: [[bottom], [makeCreature("rex", "dog")]],
    });

    expect(controller.playCard(players[0], top, 0, 1).success).toBe(true);

    expect(bottom.matched).toBe(true);
    expect(top.matched).toBe(true);
    expect(top.facedUp).toBe(false);
    expect(controller.canClickActivate(players[0], 0)).toBe(true);
  });
});

describe("getPairAbility", () => {
  it("names the viewer's own pair, face down or not", () => {
    const { controller, players } = setupHiddenPair();
    expect(controller.getPairAbility(players[0], 0)).toBe("seeEverything");
    controller.activatePair(0);
    expect(controller.getPairAbility(players[0], 0)).toBe("seeEverything");
  });

  it("hides the opponent's pair until it is face up", () => {
    const theirBottom = makeCreature("bella", "cat", "multipleAttacks");
    const theirTop = makeCreature("bella", "cat", "multipleAttacks");
    matchPair(theirBottom, theirTop, { active: false });
    const { controller, players } = createTestController({ fields: [[makeCreature()], [theirBottom, theirTop]] });

    expect(controller.getPairAbility(players[1], 0)).toBeNull();

    matchPair(theirBottom, theirTop, { active: true });
    expect(controller.getPairAbility(players[1], 0)).toBe("multipleAttacks");
  });

  it("is null for a row without a pair", () => {
    const { controller, players } = createTestController();
    expect(controller.getPairAbility(players[0], 0)).toBeNull();
    expect(controller.getPairAbility(players[0], 3)).toBeNull();
  });
});

describe("the Activate button (clickActivate)", () => {
  it("shows only on the current player's own hidden pair", () => {
    const { controller, players } = setupHiddenPair();
    expect(controller.canClickActivate(players[0], 0)).toBe(true);
    expect(controller.canClickActivate(players[1], 0)).toBe(false);
  });

  it("refuses the opponent's pair", () => {
    const theirBottom = lulu();
    const theirTop = lulu();
    matchPair(theirBottom, theirTop, { active: false });
    const { controller, players } = createTestController({ fields: [[makeCreature()], [theirBottom, theirTop]] });

    expect(controller.canClickActivate(players[1], 0)).toBe(false);
    expect(controller.clickActivate(players[1], 0).success).toBe(false);
    expect(theirTop.facedUp).toBe(false);
  });

  it("refuses during the AI's turn, while the AI itself may activate", () => {
    const aiBottom = lulu();
    const aiTop = lulu();
    matchPair(aiBottom, aiTop, { active: false });
    const { controller, players } = createTestController({
      fields: [[makeCreature()], [aiBottom, aiTop]],
      currentPlayerIndex: 1,
      player2IsAI: true,
    });

    expect(controller.canClickActivate(players[1], 0)).toBe(false);
    expect(controller.clickActivate(players[1], 0)).toEqual({ success: false, reason: "Wait for the AI to finish its turn" });
    expect(aiTop.facedUp).toBe(false);

    expect(controller.activatePair(0).success).toBe(true);
  });

  it("does not start an attack", () => {
    const { controller, players } = setupHiddenPair();

    expect(controller.clickActivate(players[0], 0).success).toBe(true);

    expect(controller.getPendingAction()).toBe(null);
    expect(controller.getTurnType()).toBe("reinforce");
    expect(controller.getMovesLeft()).toBe(2);
  });
});
