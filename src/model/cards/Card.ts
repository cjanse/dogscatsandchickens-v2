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

  /** Clears any state that only makes sense while the card is on the field. Called whenever it leaves the field. */
  resetFieldState(): void {
    this.facedUp = false;
  }
}