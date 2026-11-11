import { describe, it, expect } from "vitest";
import type { ActionCard } from "../../model/cards/ActionCard";
import type { ActionType } from "../../model/types/ActionType";
import {
  canPlayAction,
  canRevealWithTea,
  canRevive,
  endHandReveal,
  isPlayableCard,
  revealWithTea,
  revive,
  reviveKind,
  startHandReveal,
  stealRandomCard,
} from "../../model/rules/Actions";
import { createTestController, makeAction, makeCreature, makeUpgrade } from "../controller/helpers";

const action = (id: string, type: ActionType) => makeAction(id, type) as ActionCard;

describe("reviveKind", () => {
  it("maps each Spirit to the kind of card it revives", () => {
    expect(reviveKind(action("Beach_Spirits", "spirit"))).toBe("upgrade");
    expect(reviveKind(action("Forest_Spirits", "spirit"))).toBe("creature");
    expect(reviveKind(action("River_Spirits", "spirit"))).toBe("action");
  });

  it("is null for cards that are not Spirits", () => {
    expect(reviveKind(action("Bird_Army_1", "birdArmy"))).toBeNull();
    expect(reviveKind(makeCreature())).toBeNull();
    expect(reviveKind(action("Unknown_Spirits", "spirit"))).toBeNull();
  });
});

describe("canPlayAction", () => {
  it("lets each Spirit play only while the discard pile has a card of its kind", () => {
    const spirits = [action("Beach_Spirits", "spirit"), action("Forest_Spirits", "spirit"), action("River_Spirits", "spirit")];
    const { game, players } = createTestController();
    const playable = () => spirits.map(c => canPlayAction(game, players[0], c));

    expect(playable()).toEqual([false, false, false]);

    game.discard(makeCreature("dead"));
    expect(playable()).toEqual([false, true, false]);

    game.discard(makeUpgrade());
    game.discard(makeAction("used", "messyDorm"));
    expect(playable()).toEqual([true, true, true]);
  });

  it("lets Power of Tea play only while the opponent has a face-down card on the field", () => {
    const tea = action("Power_of_Tea_1", "powerOfTea");
    const { game, players } = createTestController();
    expect(canPlayAction(game, players[0], tea)).toBe(true);

    players[1].field[0][0]!.reveal();
    expect(canPlayAction(game, players[0], tea)).toBe(false);
  });

  it("looks at the opponent of the player asked about, not of the current player", () => {
    const tea = action("Power_of_Tea_1", "powerOfTea");
    const { game, players } = createTestController();
    players[0].field[0][0]!.reveal();

    // Player 0 is up. Player 1's Tea would target player 0's field, which is all face up.
    expect(canPlayAction(game, players[0], tea)).toBe(true);
    expect(canPlayAction(game, players[1], tea)).toBe(false);
  });

  it("lets Bird Army play only while the opponent has cards in hand", () => {
    const birds = action("Bird_Army_1", "birdArmy");
    const { game, players } = createTestController({ hands: [[], [makeCreature("held")]] });
    expect(canPlayAction(game, players[0], birds)).toBe(true);
    expect(canPlayAction(game, players[1], birds)).toBe(false);
  });

  it("always lets Messy Dorm play", () => {
    const { game, players } = createTestController();
    expect(canPlayAction(game, players[0], action("Messy_Dorm_1", "messyDorm"))).toBe(true);
  });
});

describe("isPlayableCard", () => {
  it("always allows a creature, and an upgrade only while a creature has a free slot", () => {
    const { game, players } = createTestController();
    expect(isPlayableCard(game, players[0], makeCreature("any"))).toBe(true);
    expect(isPlayableCard(game, players[0], makeUpgrade())).toBe(true);

    players[0].field[0][2] = makeUpgrade("u1");
    players[0].field[0][3] = makeUpgrade("u2");
    expect(isPlayableCard(game, players[0], makeUpgrade())).toBe(false);
  });

  it("asks canPlayAction about action cards", () => {
    const { game, players } = createTestController();
    expect(isPlayableCard(game, players[0], makeAction("Forest_Spirits", "spirit"))).toBe(false);
    expect(isPlayableCard(game, players[0], makeAction("Messy_Dorm_1", "messyDorm"))).toBe(true);
  });
});

describe("Spirits", () => {
  it("only revive a card of their own kind", () => {
    const forest = action("Forest_Spirits", "spirit");
    expect(canRevive(forest, makeCreature())).toBe(true);
    expect(canRevive(forest, makeUpgrade())).toBe(false);
    expect(canRevive(makeCreature(), makeCreature())).toBe(false);
  });

  it("move the card from the discard pile into the hand", () => {
    const dead = makeCreature("dead");
    const { game, players } = createTestController();
    game.discard(dead);

    expect(revive(game, players[0], dead)).toBe(true);
    expect(game.discardPile).toEqual([]);
    expect(players[0].hand).toEqual([dead]);
  });

  it("refuse a card that is not in the discard pile", () => {
    const { game, players } = createTestController();
    expect(revive(game, players[0], makeCreature("elsewhere"))).toBe(false);
    expect(players[0].hand).toEqual([]);
  });
});

describe("stealRandomCard", () => {
  it("takes the card of the chosen kind that the random number picks", () => {
    const first = makeCreature("first");
    const upgrade = makeUpgrade();
    const second = makeCreature("second");
    const { players } = createTestController({ hands: [[], [first, upgrade, second]] });

    // Two creatures to pick from: 0.6 picks the second one
    const stolen = stealRandomCard(players[0], players[1], "creature", () => 0.6);

    expect(stolen).toBe(second);
    expect(players[0].hand).toEqual([second]);
    expect(players[1].hand).toEqual([first, upgrade]);
  });

  it("returns null and moves nothing when the victim has no card of that kind", () => {
    const { players } = createTestController({ hands: [[], [makeCreature("held")]] });
    expect(stealRandomCard(players[0], players[1], "action", () => 0)).toBeNull();
    expect(players[0].hand).toEqual([]);
    expect(players[1].hand).toHaveLength(1);
  });
});

describe("Power of Tea", () => {
  it("targets only a face-down card", () => {
    const { players } = createTestController();
    expect(canRevealWithTea(players[1], 0, 0)).toBe(true);
    expect(canRevealWithTea(players[1], 0, 1)).toBe(false); // empty cell
    expect(canRevealWithTea(players[1], 5, 0)).toBe(false); // no such row

    players[1].field[0][0]!.reveal();
    expect(canRevealWithTea(players[1], 0, 0)).toBe(false);
  });

  it("flips the target face up", () => {
    const { players } = createTestController();
    revealWithTea(players[1], 0, 0);
    expect(players[1].field[0][0]!.facedUp).toBe(true);
  });
});

describe("Messy Dorm", () => {
  it("reveals the opponent's hand until the reveal ends, and remembers which Dorm started it", () => {
    const dorm = makeAction("Messy_Dorm_1", "messyDorm");
    const { game, players } = createTestController({ hands: [[dorm], []] });

    startHandReveal(game, players[0], dorm);
    expect(game.temporaryEffects).toEqual([
      { type: "revealHand", sourcePlayerId: 0, targetPlayerId: 1, cardInstanceId: dorm.instanceId },
    ]);

    // Only the player who started it can end it
    expect(endHandReveal(game, players[1])).toBeUndefined();
    expect(endHandReveal(game, players[0])?.cardInstanceId).toBe(dorm.instanceId);
    expect(game.temporaryEffects).toEqual([]);
  });
});
