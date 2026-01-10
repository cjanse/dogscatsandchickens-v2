import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { CreatureType } from "../types/CreatureType";
import type { MatchingAbilityType } from "../types/MatchingAbilityType";
import { Card } from "./Card";

export class CreatureCard extends Card {
  creatureType: CreatureType;
  facedUp: boolean = false;
  matchingAbilityType: MatchingAbilityType;
  matched: boolean = false;

  constructor(id: string, name: string, creatureType: CreatureType, matchingAbilityType: MatchingAbilityType, instanceId?: string) {
    super(id, name, "creature", instanceId);
    this.creatureType = creatureType;
    this.matchingAbilityType = matchingAbilityType;
  }

  canPlay() {
    return true;
  }

  onPlay(board: GameBoard, player: Player) {
    // placement handled elsewhere
  }
}