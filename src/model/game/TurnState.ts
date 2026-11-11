import type { CreatureCard } from "../cards/CreatureCard";
import type { TurnType } from "../types/TurnType";

/** The creature that started the current attack, and where it sits on its owner's field. */
export interface AttackingCard {
  card: CreatureCard;
  row: number;
  col: number;
}

/**
 * Everything scoped to the current player's turn. `GameBoard.nextTurn()` resets it.
 * The move limit itself is derived from the player's turn count (see `GameBoard.maxMovesPerTurn`).
 */
export class TurnState {
  movesThisTurn = 0;
  turnType: TurnType = "reinforce";
  hasDrawn = false;
  attackingCard: AttackingCard | null = null;
  /** The row of the matched Cat that just attacked: only that pair may attack again this turn. */
  extraAttackRow: number | null = null;

  useMove(): void {
    this.movesThisTurn += 1;
  }

  /** An attack consumes the whole turn. */
  useAllMoves(maxMoves: number): void {
    this.movesThisTurn = maxMoves;
  }

  markDrawn(): void {
    this.hasDrawn = true;
  }

  beginAttack(attacker: AttackingCard): void {
    this.attackingCard = attacker;
    this.turnType = "attack";
  }

  /**
   * Clears the attacker. `turnType` stays "attack" for the rest of the turn. `extraAttackRow` is the row
   * of the matched Cat that may attack again (the one that just attacked), or null if none may.
   */
  finishAttack(extraAttackRow: number | null): void {
    this.attackingCard = null;
    this.extraAttackRow = extraAttackRow;
  }

  /**
   * Drops an attack that was started but not resolved. The turn goes back to "reinforce", unless a
   * matched Cat already attacked this turn (`extraAttackRow`), in which case it stays an attack turn.
   */
  cancelAttack(): void {
    this.attackingCard = null;
    if (this.extraAttackRow === null) this.turnType = "reinforce";
  }

  reset(): void {
    this.movesThisTurn = 0;
    this.turnType = "reinforce";
    this.hasDrawn = false;
    this.attackingCard = null;
    this.extraAttackRow = null;
  }
}
