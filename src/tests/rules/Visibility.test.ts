import { describe, it, expect } from "vitest";
import { isCardVisible } from "../../model/rules/Visibility";
import { startHandReveal } from "../../model/rules/Actions";
import { createTestController, makeAction, makeCreature } from "../controller/helpers";

describe("isCardVisible", () => {
  it("shows a player their own cards, face down or not", () => {
    const held = makeCreature("held");
    const { game, players } = createTestController({ hands: [[held], []] });
    const own = players[0].field[0][0]!;
    expect(own.facedUp).toBe(false);

    expect(isCardVisible(game, own, players[0], players[0])).toBe(true);
    expect(isCardVisible(game, held, players[0], players[0])).toBe(true);
  });

  it("hides the opponent's hand and face-down field cards, and shows their face-up ones", () => {
    const held = makeCreature("held");
    const { game, players } = createTestController({ hands: [[], [held]] });
    const fieldCard = players[1].field[0][0]!;

    expect(isCardVisible(game, held, players[1], players[0])).toBe(false);
    expect(isCardVisible(game, fieldCard, players[1], players[0])).toBe(false);

    fieldCard.facedUp = true;
    expect(isCardVisible(game, fieldCard, players[1], players[0])).toBe(true);
  });

  it("shows the target's hand during a Messy Dorm reveal, only to the player who played it", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const held = makeCreature("held");
    const ownHeld = makeCreature("own_held");
    const { game, players } = createTestController({ hands: [[dorm, ownHeld], [held]] });
    startHandReveal(game, players[0], dorm);

    expect(isCardVisible(game, held, players[1], players[0])).toBe(true);
    // The reveal is one-way: the target does not see the source's hand
    expect(isCardVisible(game, ownHeld, players[0], players[1])).toBe(false);
  });

  it("does not reveal the target's face-down field cards during a Messy Dorm reveal", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const { game, players } = createTestController({ hands: [[dorm], []] });
    startHandReveal(game, players[0], dorm);

    expect(isCardVisible(game, players[1].field[0][0]!, players[1], players[0])).toBe(false);
  });
});
