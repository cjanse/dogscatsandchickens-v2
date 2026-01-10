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

    playToField(card: Card, row: number, col: number) {
        if (!this.field[row][col]) {
            this.field[row][col] = card;
            this.hand = this.hand.filter(c => c !== card);
        }
    }
}