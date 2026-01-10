import { describe, it, expect } from 'vitest';
import { Player } from '../../model/game/Player';
import { CardFactory } from '../../model/cards/CardFactory';
import type { CardData } from '../../model/types/CardData';

describe('Player', () => {
    it('can add and remove cards from hand', () => {
        const player = new Player(1);

        const data: CardData = {
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin',
            front: 'dog_basic.jpg',
            back: 'dog_basic.jpg'
        };

        const card = CardFactory.create(data);
        player.addToHand(card);

        expect(player.hand.length).toBe(1);
        expect(player.hand[0].id).toBe("dog_basic");
        const removed = player.removeFromHand(card.instanceId);
        expect(removed).toBe(card);
        expect(player.hand.length).toBe(0);
    });

    it('can place cards on field', () => {
        const player = new Player(0);

        const data: CardData = {
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin',
            front: 'dog_basic.jpg',
            back: 'dog_basic.jpg'
        };

        const card = CardFactory.create(data);
        player.addToHand(card);
        expect(player.hand.length).toBe(1);
        expect(player.hand[0].id).toBe("dog_basic");
        player.playToField(card.instanceId, 0, 0);

        expect(player.field[0][0]).toBe(card);
        expect(player.hand.length).toBe(0);
    });
});