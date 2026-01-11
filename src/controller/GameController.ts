import { GameBoard } from "../model/game/GameBoard";
import { Player } from "../model/game/Player";
import { DeckFactory } from "../model/deck/DeckFactory";
import type { CardData } from "../model/types/CardData";

export class GameController {
  private game: GameBoard;

  constructor(
    cardDefs: Record<string, CardData>,
    deckConfig: Record<string, number>
  ) {
    const deck = DeckFactory.create(deckConfig, cardDefs);

    const player1 = new Player(0);
    const player2 = new Player(1);

    this.game = new GameBoard([player1, player2], deck);
  }

  /** Read-only access for the UI */
  getGameState(): GameBoard {
    return this.game;
  }

  /** Player actions */
  drawCard(playerIndex: number) {
    const player = this.game.players[playerIndex];
    const card = this.game.deck.draw();
    if (!card) return;

    player.addToHand(card);
  }

  playCard(
    playerIndex: number,
    cardInstanceId: string,
    row: number,
    col: number
  ) {
    const player = this.game.players[playerIndex];
    player.playToField(cardInstanceId, row, col);
  }

  endTurn() {
    this.game.nextTurn();
  }
}