import { describe, it, expect } from 'vitest';
import { DeckFactory } from '../../model/deck/DeckFactory';
import { Deck } from '../../model/deck/Deck';
import type { CardData } from '../../model/types/CardData';

describe('DeckFactory', () => {
    it('creates a deck with the correct number of cards', () => {
        const cardDefs: Record<string, CardData> = {
            dog_basic: {
                id: 'dog_basic',
                name: 'Basic Dog',
                type: 'creature',
                creatureType: 'dog',
                matchingAbilityType: 'alwaysWin',
                front: 'dog_basic.jpg',
                back: 'dog_basic.jpg'
            },
        };

        const deckConfig = { dog_basic: 3 };
        const deck: Deck = DeckFactory.create(deckConfig, cardDefs);

        expect(deck.size).toBe(3);

        const uniqueIds = new Set(deck['cards'].map(c => c.instanceId));
        expect(uniqueIds.size).toBe(3); // unique instanceIds
    });
});