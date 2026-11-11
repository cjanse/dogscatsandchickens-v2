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
  /** Set after a matched Cat attacks, so it may attack again this turn. */
  allowExtraAttack = false;

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

  /** Clears the attacker. `turnType` stays "attack" for the rest of the turn. */
  finishAttack(allowExtraAttack: boolean): void {
    this.attackingCard = null;
    this.allowExtraAttack = allowExtraAttack;
  }

  /**
   * Drops an attack that was started but not resolved. The turn goes back to "reinforce", unless a
   * matched Cat already attacked this turn (`allowExtraAttack`), in which case it stays an attack turn.
   */
  cancelAttack(): void {
    this.attackingCard = null;
    if (!this.allowExtraAttack) this.turnType = "reinforce";
  }

  reset(): void {
    this.movesThisTurn = 0;
    this.turnType = "reinforce";
    this.hasDrawn = false;
    this.attackingCard = null;
    this.allowExtraAttack = false;
  }
}
