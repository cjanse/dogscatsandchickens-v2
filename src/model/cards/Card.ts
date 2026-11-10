import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { CardType } from "../types/CardType";

export abstract class Card {
  readonly id: string;
  readonly name: string;
  readonly type: CardType;
  readonly front: string;
  readonly back: string;
  readonly instanceId: string
  facedUp: boolean = false;

  constructor(id: string, name: string, type: CardType, front: string, back:string, instanceId?: string) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.front = front;
    this.back = back;
    this.instanceId = instanceId ?? crypto.randomUUID();
  }

  /** Clears any state that only makes sense while the card is on the field. Called whenever it leaves the field. */
  resetFieldState(): void {
    this.facedUp = false;
  }

  abstract canPlay(board: GameBoard, player: Player): boolean;
  abstract onPlay(board: GameBoard, player: Player): void;
}