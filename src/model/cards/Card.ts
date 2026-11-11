import type { CardType } from "../types/CardType";

export abstract class Card {
  readonly id: string;
  readonly name: string;
  readonly type: CardType;
  readonly instanceId: string
  private _facedUp: boolean = false;

  constructor(id: string, name: string, type: CardType, instanceId?: string) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.instanceId = instanceId ?? crypto.randomUUID();
  }

  /** True while the card is permanently revealed on the field. It only changes through `reveal()` and `hide()`. */
  get facedUp(): boolean {
    return this._facedUp;
  }

  reveal(): void {
    this._facedUp = true;
  }

  hide(): void {
    this._facedUp = false;
  }

  /** Clears any state that only makes sense while the card is on the field. Called whenever it leaves the field. */
  resetFieldState(): void {
    this.hide();
  }
}