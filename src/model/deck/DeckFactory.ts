import type { Card } from "../cards/Card";
import { CardFactory } from "../cards/CardFactory";
import type { CardData } from "../types/CardData";
import { Deck } from "./Deck";

export class DeckFactory {
    static create(
        deckConfig: Record<string, number>,
        cardDefs: Record<string, CardData>
    ): Deck {
        const cards: Card[] = [];

        for (const [cardId, count] of Object.entries(deckConfig)) {
            const data = cardDefs[cardId];

            for (let i = 0; i < count; i++) {
                cards.push(CardFactory.create(data));
            }
        }

        return new Deck(cards);
    }
}