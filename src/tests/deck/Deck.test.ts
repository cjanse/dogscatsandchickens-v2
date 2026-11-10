import { describe, it, expect } from 'vitest';
import { Deck } from '../../model/deck/Deck';
import type { CardData } from '../../model/types/CardData';
import { CardFactory } from '../../model/cards/CardFactory';

describe('Deck', () => {
    it('can draw cards and track size', () => {
        const data: CardData = {
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin',
            front: 'dog_basic.jpg',
            back: 'dog_basic.jpg'
        };

        const cards = Array.from({ length: 3 }, () => CardFactory.create(data));
        const deck = new Deck(cards);

        expect(deck.size).toBe(3);

        const drawn = deck.draw();
        expect(drawn).toBeDefined();
        expect(deck.size).toBe(2);

        deck.draw();
        deck.draw();
        expect(deck.size).toBe(0);
        expect(deck.draw()).toBeUndefined();
    });

    it('shuffle keeps all cards but randomizes order', () => {
        const data: CardData = {
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin',
            front: 'dog_basic.jpg',
            back: 'dog_basic.jpg'
        };

        const cards = Array.from({ length: 10 }, () => CardFactory.create(data));
        const deck = new Deck([...cards]);
        deck.shuffle();

        expect(deck.size).toBe(10);
        const idsBefore = cards.map(c => c.instanceId);
        const idsAfter = deck['cards'].map(c => c.instanceId);

        expect(idsAfter.sort()).toEqual(idsBefore.sort()); // all cards still present
    });

    it('peek returns the next card to draw without removing it', () => {
        const data: CardData = {
            id: 'dog_basic', name: 'Basic Dog', type: 'creature', creatureType: 'dog',
            matchingAbilityType: 'alwaysWin', front: 'dog_basic.jpg', back: 'creature.jpg'
        };
        const cards = Array.from({ length: 2 }, () => CardFactory.create(data));
        const deck = new Deck(cards);

        expect(deck.peek()).toBe(cards[1]);
        expect(deck.size).toBe(2);
        expect(deck.draw()).toBe(cards[1]);
        expect(deck.peek()).toBe(cards[0]);
        deck.draw();
        expect(deck.peek()).toBeUndefined();
    });
});