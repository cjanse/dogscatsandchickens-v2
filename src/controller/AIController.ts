import type { GameController } from "./GameController";
import type { PlayerView } from "../model/game/views";
import type { Card } from "../model/cards/Card";

interface Move {
  type: "placeCard" | "attack";
  card?: Card;
  row?: number;
  col?: number;
  targetRow?: number;
  targetCol?: number;
}

export class AIController {
  private gameController: GameController;

  constructor(gameController: GameController) {
    this.gameController = gameController;
  }

  /**
   * Execute a random valid move for the AI player
   */
  executeAITurn(): void {
    const currentPlayer = this.gameController.getGameState().currentPlayer;

    if (!currentPlayer.isAI || this.gameController.isGameOver()) {
      return;
    }

    // Draw first. On a recovery turn the draw only becomes available once a
    // creature is on the field, so retry after every move.
    this.drawIfPossible(currentPlayer);

    // Keep making moves while there are moves left
    while (this.gameController.getMovesLeft() > 0) {
      const moves = this.getValidMoves(currentPlayer);

      if (moves.length === 0) {
        break;
      }

      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      this.executeMove(randomMove, currentPlayer);
      this.drawIfPossible(currentPlayer);
    }

    // Handle card discard if needed
    while (this.gameController.hasExtraHandCards(currentPlayer)) {
      this.gameController.startDiscardPhase();
      const cardToDiscard = currentPlayer.hand[0];
      this.gameController.discardHandCard(cardToDiscard);
    }
  }

  private drawIfPossible(player: PlayerView): void {
    if (this.gameController.canDrawCard(player.id)) {
      this.gameController.drawCard(player.id);
    }
  }

  /**
   * Get all valid moves for the AI player
   */
  private getValidMoves(player: PlayerView): Move[] {
    const moves: Move[] = [];

    // Check for valid card placements (creatures and upgrades)
    for (const card of player.hand) {
      // For now, we won't use action cards in dumb AI
      if (card.type !== "creature" && card.type !== "upgrade") continue;

      // Check all possible positions
      for (let row = 0; row < player.field.length; row++) {
        for (let col = 0; col < 4; col++) {
          if (
            this.gameController.canPlayCard(
              player.id,
              card.instanceId,
              row,
              col
            )
          ) {
            moves.push({
              type: "placeCard",
              card,
              row,
              col,
            });
          }
        }
      }
    }

    // Check for valid attacks
    const opponent = this.gameController
      .getGameState()
      .players.find((p) => p !== player);
    if (opponent) {
      for (let row = 0; row < player.field.length; row++) {
        for (let col = 0; col < 4; col++) {
          // Check if current player's creature can attack
          if (this.gameController.canAttackWith(row, col)) {
            // Can start attack with this creature
            for (
              let targetRow = 0;
              targetRow < opponent.field.length;
              targetRow++
            ) {
              for (let targetCol = 0; targetCol < 4; targetCol++) {
                // Check if target is valid
                if (this.gameController.isValidAttackTarget(targetRow, targetCol)) {
                  moves.push({
                    type: "attack",
                    row,
                    col,
                    targetRow,
                    targetCol,
                  });
                }
              }
            }
          }
        }
      }
    }

    return moves;
  }

  /**
   * Execute a specific move
   */
  private executeMove(move: Move, player: PlayerView): void {
    switch (move.type) {
      case "placeCard":
        if (move.card && move.row !== undefined && move.col !== undefined) {
          this.gameController.playCard(
            player.id,
            move.card.instanceId,
            move.row,
            move.col
          );
        }
        break;

      case "attack":
        if (
          move.row !== undefined &&
          move.col !== undefined &&
          move.targetRow !== undefined &&
          move.targetCol !== undefined
        ) {
          // Start attack
          this.gameController.startAttack(move.row, move.col);
          // Resolve attack
          this.gameController.resolveAttack(move.targetRow, move.targetCol);
        }
        break;
    }
  }
}
