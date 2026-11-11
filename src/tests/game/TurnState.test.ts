import { describe, it, expect } from "vitest";
import { TurnState } from "../../model/game/TurnState";
import { makeCreature } from "../controller/helpers";

describe("TurnState", () => {
  it("starts as a fresh reinforce turn", () => {
    const turn = new TurnState();
    expect(turn.movesThisTurn).toBe(0);
    expect(turn.turnType).toBe("reinforce");
    expect(turn.hasDrawn).toBe(false);
    expect(turn.attackingCard).toBeNull();
    expect(turn.extraAttackRow).toBeNull();
  });

  it("counts moves one at a time, or all at once", () => {
    const turn = new TurnState();
    turn.useMove();
    expect(turn.movesThisTurn).toBe(1);
    turn.useAllMoves(2);
    expect(turn.movesThisTurn).toBe(2);
  });

  it("records a draw", () => {
    const turn = new TurnState();
    turn.markDrawn();
    expect(turn.hasDrawn).toBe(true);
  });

  it("tracks an attack from start to finish", () => {
    const turn = new TurnState();
    const attacker = { card: makeCreature(), row: 1, col: 0 };

    turn.beginAttack(attacker);
    expect(turn.attackingCard).toBe(attacker);
    expect(turn.turnType).toBe("attack");

    turn.finishAttack(0);
    expect(turn.attackingCard).toBeNull();
    expect(turn.extraAttackRow).toBe(0);
    expect(turn.turnType).toBe("attack");
  });

  it("cancelling an attack goes back to reinforce", () => {
    const turn = new TurnState();
    turn.beginAttack({ card: makeCreature(), row: 0, col: 0 });

    turn.cancelAttack();

    expect(turn.attackingCard).toBeNull();
    expect(turn.turnType).toBe("reinforce");
  });

  it("cancelling a second attack keeps the turn an attack turn once a matched Cat has attacked", () => {
    const turn = new TurnState();
    turn.beginAttack({ card: makeCreature(), row: 0, col: 0 });
    turn.finishAttack(0);
    turn.beginAttack({ card: makeCreature(), row: 0, col: 0 });

    turn.cancelAttack();

    expect(turn.attackingCard).toBeNull();
    expect(turn.extraAttackRow).toBe(0);
    expect(turn.turnType).toBe("attack");
  });

  it("reset clears everything", () => {
    const turn = new TurnState();
    turn.useMove();
    turn.markDrawn();
    turn.beginAttack({ card: makeCreature(), row: 0, col: 0 });
    turn.finishAttack(0);

    turn.reset();

    expect(turn.movesThisTurn).toBe(0);
    expect(turn.turnType).toBe("reinforce");
    expect(turn.hasDrawn).toBe(false);
    expect(turn.attackingCard).toBeNull();
    expect(turn.extraAttackRow).toBeNull();
  });
});
