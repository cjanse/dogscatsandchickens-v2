import { describe, it, expect } from "vitest";
import type { Card } from "../../model/cards/Card";
import { Deck } from "../../model/deck/Deck";
import { GameBoard } from "../../model/game/GameBoard";
import { Player } from "../../model/game/Player";
import { dealStartingHand, setUpGame } from "../../model/rules/Setup";
import { makeAction, makeCreature } from "../controller/helpers";

/** 12 creatures and 18 action cards, so a random 5-card hand often has too few creatures. */
function makeDeck(): Deck {
  const cards: Card[] = [];
  for (let i = 0; i < 12; i++) cards.push(makeCreature(`creature_${i}`));
  for (let i = 0; i < 18; i++) cards.push(makeAction(`action_${i}`, "messyDorm"));
  return new Deck(cards);
}

const creaturesIn = (hand: readonly Card[]) => hand.filter(card => card.type === "creature").length;

describe("opening deal", () => {
  it("gives every player 5 face-down cards with at least 3 creatures, and takes them from the deck", () => {
    // The shuffle is random, so repeat it
    for (let i = 0; i < 50; i++) {
      const board = new GameBoard([new Player(0, 0, 4, false), new Player(1, 0, 4, false)], makeDeck());
      board.deck.peek()!.facedUp = true; // a card that is face up must still be dealt face down

      setUpGame(board);

      for (const player of board.players) {
        expect(player.hand).toHaveLength(5);
        expect(creaturesIn(player.hand)).toBeGreaterThanOrEqual(3);
        expect(player.hand.every(card => !card.facedUp)).toBe(true);
      }
      expect(board.deck.size).toBe(30 - 10);
    }
  });

  it("deals no card twice", () => {
    const board = new GameBoard([new Player(0, 0, 4, false), new Player(1, 0, 4, false)], makeDeck());
    setUpGame(board);

    const dealt = board.players.flatMap(player => [...player.hand]);
    expect(new Set(dealt).size).toBe(10);
  });

  it("deals what it can from a deck that runs out, and nothing from an empty one", () => {
    const player = new Player(0, 0, 4, false);
    dealStartingHand(new Deck([makeCreature("only_1"), makeCreature("only_2")]), player);
    expect(player.hand).toHaveLength(2);

    const empty = new Player(1, 0, 4, false);
    setUpGame(new GameBoard([empty, new Player(2, 0, 4, false)], new Deck([])));
    expect(empty.hand).toHaveLength(0);
  });
});
