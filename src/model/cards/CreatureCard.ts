import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { CreatureType } from "../types/CreatureType";
import { Card } from "./Card";

export class CreatureCard extends Card {
  creatureType: CreatureType;
  facedUp: boolean = false;
  matchingAbilityDescription: string;
  matched: boolean = false;

  constructor(id: string, name: string, creatureType: CreatureType, matchingAbilityDescription: string, instanceId?: string) {
    super(id, name, "creature", instanceId);
    this.creatureType = creatureType;
    this.matchingAbilityDescription = matchingAbilityDescription;
  }

  canPlay() {
    return true;
  }

  onPlay(board: GameBoard, player: Player) {
    // placement handled elsewhere
  }
}