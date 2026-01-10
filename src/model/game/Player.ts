import type { Card } from "../cards/Card";

export class Player {
    readonly id: number;
    hand: Card[];
    field: Card[][];

    constructor(id: number, fieldRows = 2, fieldCols = 3) {
        this.id = id;
        this.hand = [];
        this.field = Array.from({ length: fieldRows }, () =>
            Array(fieldCols).fill(null)
        );
    }

    addToHand(card: Card) {
        this.hand.push(card);
    }

    removeFromHand(instanceId: string): Card | undefined {
        const index = this.hand.findIndex(obj => obj.instanceId === instanceId)
        if (index === -1) return undefined;
        return this.hand.splice(index, 1)[0];
    }

    playToField(instanceId: string, row: number, col: number) {
        const index = this.hand.findIndex(obj => obj.instanceId === instanceId)
        if (index === -1) return;
        const playCard = this.hand[index];
        if (!this.field[row][col]) {
            this.field[row][col] = playCard;
            this.hand = this.hand.filter(c => c !== playCard);
        }
    }
}