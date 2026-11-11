import type { Card } from "../cards/Card";
import type { CreatureCard } from "../cards/CreatureCard";
import type { PlayerView } from "./views";

/** What `Player.playToField` did: it either placed the card (maybe making a matched pair) or changed nothing. */
export type PlaceResult =
    | { placed: false }
    | { placed: true; match: { card: CreatureCard; twin: CreatureCard } | null };

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

    /** A card in a hand is never face up, so adding one (a draw, a steal, a revive) hides it. */
    addToHand(card: Card) {
        card.hide();
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
     * Reports whether the card was placed. Nothing changes (no new row either) when it wasn't.
     * A creature placed next to its twin (same card id) makes a matched pair, which is returned for the caller.
     */
    playToField(instanceId: string, row: number, col: number): PlaceResult {
        const playCard = this.hand.find(obj => obj.instanceId === instanceId);
        if (!playCard) return { placed: false };
        const width = this.field[0]?.length ?? this.fieldCols;
        if (col < 0 || col >= width) return { placed: false };

        const opensAbove = row === -1 && this.field.length > 0;
        const opensBelow = row === this.field.length;
        if (!opensAbove && !opensBelow && !this.field[row]) return { placed: false };
        if (!opensAbove && !opensBelow && this.field[row][col]) return { placed: false };

        if (opensAbove) {
            this.field.unshift(new Array(width).fill(null));
            row = 0;
        } else if (opensBelow) {
            this.field.push(new Array(width).fill(null));
        }
        this.field[row][col] = playCard;
        this.hand = this.hand.filter(c => c !== playCard);

        // Only a creature in a creature column (0 or 1) can match a twin
        if (playCard.type !== "creature" || (col !== 0 && col !== 1)) {
            return { placed: true, match: null };
        }
        const twin = this.field[row][col === 0 ? 1 : 0];
        if (twin && twin.id === playCard.id) {
            const card = playCard as CreatureCard;
            const twinCard = twin as CreatureCard;
            twinCard.reveal();
            twinCard.matched = true;
            card.reveal();
            card.matched = true;
            return { placed: true, match: { card, twin: twinCard } };
        }
        return { placed: true, match: null };
    }
}
