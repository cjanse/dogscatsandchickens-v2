import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { CardType } from "../types/CardType";

export abstract class Card {
  readonly id: string;
  readonly name: string;
  readonly type: CardType;
  readonly instanceId: string
  facedUp: boolean = false;

  constructor(id: string, name: string, type: CardType, instanceId?: string) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.instanceId = instanceId ?? crypto.randomUUID();
  }

  abstract canPlay(board: GameBoard, player: Player): boolean;
  abstract onPlay(board: GameBoard, player: Player): void;
}