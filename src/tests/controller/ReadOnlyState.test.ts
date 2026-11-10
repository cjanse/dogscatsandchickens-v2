import { describe, it, expect } from "vitest";
import { createTestController, makeCreature } from "./helpers";

/**
 * getGameState() hands the views a live board typed as read-only.
 * The @ts-expect-error lines are checked by `tsc -b` (npm run build): if the
 * state ever becomes mutable again, the unused directive is a compile error.
 */
describe("getGameState() is read-only", () => {
  it("rejects mutation of model internals at compile time", () => {
    const { controller } = createTestController({ hands: [[makeCreature("a")], []] });
    const game = controller.getGameState();
    const card = makeCreature("b");

    // The calls below are wrapped so a mutation that does compile can't run and break the assertion.
    const attempts = [
      // @ts-expect-error hand is readonly
      () => game.players[0].hand.push(card),
      // @ts-expect-error DeckView has no shuffle
      () => game.deck.shuffle(),
      // @ts-expect-error discardPile is readonly
      () => game.discardPile.push(card),
      // @ts-expect-error field rows are readonly
      () => { game.players[0].field[0][0] = null; },
      // @ts-expect-error temporaryEffects is readonly
      () => game.temporaryEffects.push({ type: "revealHand", sourcePlayerId: 0, targetPlayerId: 1 }),
    ];

    expect(attempts).toHaveLength(5);
  });

  it("still reads the live state", () => {
    const { controller } = createTestController({ hands: [[makeCreature("a")], []] });
    const game = controller.getGameState();

    expect(game.players[0].hand).toHaveLength(1);
    expect(game.currentPlayer.id).toBe(0);
    expect(game.deck.peek()).toBeUndefined();
  });
});
