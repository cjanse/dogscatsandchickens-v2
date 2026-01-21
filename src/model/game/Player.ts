import type { Card } from "../cards/Card";
import type { CreatureCard } from "../cards/CreatureCard";

export class Player {
    readonly id: number;
    hand: Card[];
    field: (Card | null)[][];
    turnCount: number = 0;
    isAI: boolean = false;

    constructor(id: number, fieldRows = 1, fieldCols = 4, isAI = false) {
        this.id = id;
        this.hand = [];
        this.field = Array.from({ length: fieldRows }, () =>
            Array(fieldCols).fill(null)
        );
        this.isAI = isAI;
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
        if (index === -1) return null;
        const playCard = this.hand[index];
        if (!this.field[row][col]) {
            this.field[row][col] = playCard;
            this.hand = this.hand.filter(c => c !== playCard);
            const otherColIndex = (col+1)%2
            if (this.field[row][otherColIndex] != null && (this.field[row][otherColIndex] as Card).id === playCard.id) { //Updates matched status if IDs are same
                const otherCard = this.field[row][otherColIndex] as CreatureCard;
                otherCard.facedUp = true;
                otherCard.matched = true;
                playCard.facedUp = true;
                (playCard as CreatureCard).matched = true
                // Return matched cards for controller to handle matched abilities
                return { matchedCard: playCard as CreatureCard, otherMatchedCard: otherCard };
            }
        }
        this.expandFieldIfNeeded(row)
        return null;
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