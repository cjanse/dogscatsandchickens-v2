import type { UpgradeType } from "../types/UpgradeType";
import { Card } from "./Card";

export class UpgradeCard extends Card {
  upgradeType: UpgradeType;

  constructor(id: string, name: string, front: string, back: string, upgradeType: UpgradeType, instanceId?: string) {
    super(id, name, "upgrade", front, back, instanceId);
    this.upgradeType = upgradeType;
  }
}