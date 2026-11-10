import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { ActionType } from "../types/ActionType";
import { Card } from "./Card";

export class ActionCard extends Card {
  actionType: ActionType;

  constructor(id: string, name: string, front: string, back: string, actionType: ActionType, instanceId?: string) {
    super(id, name, "action", front, back, instanceId);
    this.actionType = actionType;
  }

  canPlay() {
    return true;
  }

  onPlay(_board: GameBoard, _player: Player) {
    // placement handled elsewhere
  }
}