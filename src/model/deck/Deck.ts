import type { Card } from "../cards/Card";
import type { DeckView } from "../game/views";

export class Deck implements DeckView {
    private cards: Card[];

    constructor(cards: Card[]) {
        this.cards = [...cards];
    }

    shuffle() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(): Card | undefined {
        return this.cards.pop();
    }

    putCardBack(card: Card): void {
        this.cards.unshift(card);
    }

    get size() {
        return this.cards.length;
    }

    /** The card that would be drawn next, without drawing it. */
    peek(): Card | undefined {
        return this.cards[this.cards.length - 1];
    }
}