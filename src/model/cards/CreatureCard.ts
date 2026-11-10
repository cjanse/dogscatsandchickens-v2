import type { GameBoard } from "../game/GameBoard";
import type { Player } from "../game/Player";
import type { CreatureType } from "../types/CreatureType";
import type { MatchingAbilityType } from "../types/MatchingAbilityType";
import { Card } from "./Card";

export class CreatureCard extends Card {
  creatureType: CreatureType;
  matchingAbilityType: MatchingAbilityType;
  matched: boolean = false;

  constructor(id: string, name: string, front:string, back: string, creatureType: CreatureType, matchingAbilityType: MatchingAbilityType, instanceId?: string) {
    super(id, name, "creature", front, back, instanceId);
    this.creatureType = creatureType;
    this.matchingAbilityType = matchingAbilityType;
  }

  override resetFieldState(): void {
    super.resetFieldState();
    this.matched = false;
  }

  canPlay() {
    return true;
  }

  onPlay(_board: GameBoard, _player: Player) {
    // placement handled elsewhere
  }
}