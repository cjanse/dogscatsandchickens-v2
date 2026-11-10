import { describe, it, expect } from "vitest";
import type { Card } from "../../model/cards/Card";
import type { CreatureCard } from "../../model/cards/CreatureCard";
import { Deck } from "../../model/deck/Deck";
import { GameBoard } from "../../model/game/GameBoard";
import { Player } from "../../model/game/Player";
import { resolveBattle, type Combatant } from "../../model/rules/Battle";
import { resolveUpgradeStack } from "../../model/rules/Upgrades";
import type { CreatureType } from "../../model/types/CreatureType";
import { makeCreature, makeUpgrade } from "../controller/helpers";

/** Puts one creature (plus optional upgrades in cols 2, 3) in row 0 of each player's field. */
function setup(attackerType: CreatureType, defenderType: CreatureType, defenderUpgrades: Card[] = []) {
  const players = [new Player(0), new Player(1)];
  const board = new GameBoard(players, new Deck([]));
  const attacker: Combatant = { player: players[0], row: 0, card: makeCreature("a", attackerType) };
  const defender: Combatant = { player: players[1], row: 0, card: makeCreature("d", defenderType) };
  players[0].field[0][0] = attacker.card;
  players[1].field[0][0] = defender.card;
  defenderUpgrades.forEach((upgrade, i) => (players[1].field[0][2 + i] = upgrade));
  return { board, players, attacker, defender };
}

describe("resolveBattle", () => {
  it("reports each outcome", () => {
    let s = setup("dog", "cat");
    expect(resolveBattle(s.board, s.attacker, s.defender)).toBe("attackerWon");
    expect(s.board.discardPile).toEqual([s.defender.card]);

    s = setup("dog", "chicken");
    expect(resolveBattle(s.board, s.attacker, s.defender)).toBe("defenderWon");
    expect(s.board.discardPile).toEqual([s.attacker.card]);

    s = setup("cat", "cat");
    expect(resolveBattle(s.board, s.attacker, s.defender)).toBe("standoff");
    expect(s.board.discardPile).toEqual([]);

    s = setup("dog", "cat", [makeUpgrade("def", "defense")]);
    expect(resolveBattle(s.board, s.attacker, s.defender)).toBe("defenderSaved");
    expect(s.players[1].field[0][0]).toBe(s.defender.card);
  });

  it("flips both creatures face up", () => {
    const s = setup("cat", "cat");
    resolveBattle(s.board, s.attacker, s.defender);
    expect(s.attacker.card.facedUp).toBe(true);
    expect(s.defender.card.facedUp).toBe(true);
  });
});

describe("resolveUpgradeStack: Counter Attack", () => {
  // In a real game this can't happen while the matched Dog only gains the Dog-vs-Dog win.
  // Calling the stack directly with a Chicken "losing" to a Dog exercises the rule anyway.
  it("defeats the attacker too when the defender's type beats it", () => {
    const counter = makeUpgrade("counter", "counterAttack");
    const { board, players, attacker, defender } = setup("dog", "chicken", [counter]);

    expect(resolveUpgradeStack(board, defender, attacker)).toBe(true);

    expect(players[1].field[0][0]).toBe(defender.card);
    expect(players[0].field[0].every(c => c === null)).toBe(true);
    expect(board.discardPile).toEqual(expect.arrayContaining([attacker.card, counter]));
    expect((attacker.card as CreatureCard).facedUp).toBe(false);
  });

  it("only blocks the attack when the defender's type doesn't beat the attacker", () => {
    const counter = makeUpgrade("counter", "counterAttack");
    const { board, players, attacker, defender } = setup("dog", "cat", [counter]);

    expect(resolveUpgradeStack(board, defender, attacker)).toBe(true);

    expect(players[0].field[0][0]).toBe(attacker.card);
    expect(board.discardPile).toEqual([counter]);
  });
});
