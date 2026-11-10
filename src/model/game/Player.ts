import type { Card } from "../cards/Card";
import type { CreatureCard } from "../cards/CreatureCard";
import type { PlayerView } from "./views";

export class Player implements PlayerView {
    readonly id: number;
    hand: Card[];
    field: (Card | null)[][];
    turnCount: number = 0;
    isAI: boolean = false;
    private readonly fieldCols: number;

    /** The field starts with `fieldRows` empty rows (none by default). Playing a card into a new row adds one. */
    constructor(id: number, fieldRows = 0, fieldCols = 4, isAI = false) {
        this.id = id;
        this.fieldCols = fieldCols;
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

    /**
     * Takes the card out of a field slot and resets its field-only state (face up, matched).
     * The caller decides where it goes next: back to the hand or the discard pile.
     */
    removeFromField(row: number, col: number): Card | null {
        const card = this.field[row]?.[col];
        if (!card) return null;
        this.field[row][col] = null;
        card.resetFieldState();
        return card;
    }

    /**
     * Takes every card out of a row (resetting each one, as removeFromField does) and returns them.
     * The row itself is then deleted: the field only ever holds rows with cards in them.
     */
    removeRow(rowIndex: number): Card[] {
        const row = this.field[rowIndex];
        if (!row) return [];
        const removed: Card[] = [];
        for (let col = 0; col < row.length; col++) {
            const card = this.removeFromField(rowIndex, col);
            if (card) removed.push(card);
        }
        this.field.splice(rowIndex, 1);
        return removed;
    }

    /**
     * Plays a hand card into a field slot. `row === -1` opens a new row above all rows and
     * `row === field.length` opens one below; any other row must already exist.
     */
    playToField(instanceId: string, row: number, col: number) {
        const index = this.hand.findIndex(obj => obj.instanceId === instanceId)
        if (index === -1) return null;
        const playCard = this.hand[index];
        const width = this.field[0]?.length ?? this.fieldCols;
        if (row === -1 && this.field.length > 0) {
            this.field.unshift(new Array(width).fill(null));
            row = 0;
        } else if (row === this.field.length) {
            this.field.push(new Array(width).fill(null));
        }
        if (!this.field[row]) return null;
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
        return null;
    }
}