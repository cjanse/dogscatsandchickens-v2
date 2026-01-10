import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { ActionType } from "../types/ActionType";
import { Card } from "./Card";

export class ActionCard extends Card {
  actionType: ActionType;

  constructor(id: string, name: string, actionType: ActionType, instanceId?: string) {
    super(id, name, "action", instanceId);
    this.actionType = actionType;
  }

  canPlay() {
    return true;
  }

  onPlay(board: GameBoard, player: Player) {
    // placement handled elsewhere
  }
}