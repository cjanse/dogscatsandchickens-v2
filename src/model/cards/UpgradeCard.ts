import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { UpgradeType } from "../types/UpgradeType";
import { Card } from "./Card";

export class UpgradeCard extends Card {
  upgradeType: UpgradeType;

  constructor(id: string, name: string, upgradeType: UpgradeType, instanceId?: string) {
    super(id, name, "upgrade", instanceId);
    this.upgradeType = upgradeType;
  }

  canPlay() {
    return true;
  }

  onPlay(board: GameBoard, player: Player) {
    // placement handled elsewhere
  }
}