import type { Card } from "../cards/Card";

export class Player {
    readonly id: number;
    hand: Card[];
    field: (Card | null)[][];

    constructor(id: number, fieldRows = 1, fieldCols = 4) {
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
        this.expandFieldIfNeeded(row)
    }

    //Helper function that expands the row as necessary
    private expandFieldIfNeeded(rowIndex: number) {
        if (rowIndex === this.field.length - 1) {
            this.field.push(new Array(this.field[0].length).fill(null));
        }

        if (rowIndex === 0) {
            this.field.unshift(new Array(this.field[0].length).fill(null));
        }
    }
}