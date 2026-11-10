import { describe, it, expect } from 'vitest';
import { Player } from '../../model/game/Player';
import { CardFactory } from '../../model/cards/CardFactory';
import type { CardData } from '../../model/types/CardData';
import type { CreatureCard } from '../../model/cards/CreatureCard';

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

        expect(player.field[1][0]).toBe(card); //Expect card to be in first row due to expandFieldIfNeeded functionality
        expect(player.hand.length).toBe(0);
    });

    describe('removeFromField', () => {
        const dog = (): CardData => ({
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin',
            front: 'dog_basic.jpg',
            back: 'creature.jpg'
        });

        it('empties the slot and resets facedUp and matched on a creature', () => {
            const player = new Player(1);
            const card = CardFactory.create(dog()) as CreatureCard;
            player.field[0][0] = card;
            card.facedUp = true;
            card.matched = true;

            const removed = player.removeFromField(0, 0);

            expect(removed).toBe(card);
            expect(player.field[0][0]).toBeNull();
            expect(card.facedUp).toBe(false);
            expect(card.matched).toBe(false);
        });

        it('resets facedUp on an upgrade', () => {
            const player = new Player(1);
            const upgrade = CardFactory.create({
                id: 'fake_1',
                name: 'Fake',
                type: 'upgrade',
                upgradeType: 'fakeUpgrade',
                front: 'fake.jpg',
                back: 'upgrade.jpg'
            });
            player.field[0][2] = upgrade;
            upgrade.facedUp = true;

            expect(player.removeFromField(0, 2)).toBe(upgrade);
            expect(upgrade.facedUp).toBe(false);
        });

        it('returns null for an empty or out-of-range slot', () => {
            const player = new Player(1);
            expect(player.removeFromField(0, 0)).toBeNull();
            expect(player.removeFromField(5, 5)).toBeNull();
        });
    });

    describe('removeRow', () => {
        const dog = () => CardFactory.create({
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin',
            front: 'dog_basic.jpg',
            back: 'creature.jpg'
        }) as CreatureCard;
        const emptyRow = () => [null, null, null, null];

        it('returns every card in the row, reset, and deletes a middle row', () => {
            const player = new Player(1);
            const left = dog();
            const right = dog();
            left.matched = right.matched = true;
            left.facedUp = right.facedUp = true;
            player.field = [emptyRow(), [left, right, null, null], emptyRow()];

            const removed = player.removeRow(1);

            expect(removed).toEqual([left, right]);
            expect(left.matched).toBe(false);
            expect(right.facedUp).toBe(false);
            expect(player.field).toEqual([emptyRow(), emptyRow()]);
        });

        it('keeps the top and bottom rows as empty rows', () => {
            const player = new Player(1);
            const top = dog();
            const bottom = dog();
            player.field = [[top, null, null, null], [bottom, null, null, null]];

            expect(player.removeRow(0)).toEqual([top]);
            expect(player.removeRow(1)).toEqual([bottom]);
            expect(player.field).toEqual([emptyRow(), emptyRow()]);
        });

        it('returns nothing for a row that does not exist', () => {
            expect(new Player(1).removeRow(3)).toEqual([]);
        });
    });
});