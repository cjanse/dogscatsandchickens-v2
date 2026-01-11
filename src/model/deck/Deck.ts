import type { Card } from "../cards/Card";

export class Deck {
    private cards: Card[];

    constructor(cards: Card[]) {
        this.cards = [...cards];
    }

    shuffle() {
        this.cards.sort(() => Math.random() - 0.5);
    }

    draw(): Card | undefined {
        return this.cards.pop();
    }

    get size() {
        return this.cards.length;
    }

    //Debugging tool, need to remove in production
    get deck() {
        return this.cards
    }
}