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
            matchingAbilityType: 'alwaysWin'
        };

        const card = CardFactory.create(data);
        player.addToHand(card);

        expect(player.hand.length).toBe(1);
        expect(player.hand[0].id).toBe("dog_basic");
        const removed = player.removeFromHand(card.instanceId);
        expect(removed).toBe(card);
        expect(player.hand.length).toBe(0);
    });

    it('starts with no field rows', () => {
        expect(new Player(0).field).toEqual([]);
    });

    describe('playToField', () => {
        const dogData = (): CardData => ({
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin'
        });

        it('opens the first row on an empty field (row 0 = field.length)', () => {
            const player = new Player(0);
            const card = CardFactory.create(dogData());
            player.addToHand(card);

            player.playToField(card.instanceId, 0, 0);

            expect(player.field).toEqual([[card, null, null, null]]);
            expect(player.hand.length).toBe(0);
        });

        it('opens a new row below with row = field.length', () => {
            const player = new Player(0);
            const first = CardFactory.create(dogData());
            const second = CardFactory.create({ ...dogData(), id: 'other_dog' });
            player.addToHand(first);
            player.addToHand(second);

            player.playToField(first.instanceId, 0, 0);
            player.playToField(second.instanceId, 1, 0);

            expect(player.field).toHaveLength(2);
            expect(player.field[1][0]).toBe(second);
        });

        it('opens a new row above with row = -1', () => {
            const player = new Player(0);
            const first = CardFactory.create(dogData());
            const second = CardFactory.create({ ...dogData(), id: 'other_dog' });
            player.addToHand(first);
            player.addToHand(second);

            player.playToField(first.instanceId, 0, 0);
            player.playToField(second.instanceId, -1, 1);

            expect(player.field).toHaveLength(2);
            expect(player.field[0][1]).toBe(second);
            expect(player.field[1][0]).toBe(first);
        });

        it('does not add rows when playing into an existing row, and reports the twin without pairing or revealing it', () => {
            const player = new Player(0);
            const first = CardFactory.create(dogData());
            const twin = CardFactory.create(dogData());
            player.addToHand(first);
            player.addToHand(twin);

            player.playToField(first.instanceId, 0, 0);
            const matched = player.playToField(twin.instanceId, 0, 1);

            expect(player.field).toHaveLength(1);
            expect(matched).toEqual({ placed: true, match: { card: twin, twin: first } });
            // Pairing and revealing are rules (formPair in rules/Matching.ts), not the placement's job
            for (const card of [first, twin]) {
                expect((card as CreatureCard).matched).toBe(false);
                expect(card.facedUp).toBe(false);
            }
        });

        it('does nothing for a row that does not exist', () => {
            const player = new Player(0);
            const card = CardFactory.create(dogData());
            player.addToHand(card);

            expect(player.playToField(card.instanceId, 3, 0)).toEqual({ placed: false });
            expect(player.field).toEqual([]);
            expect(player.hand).toEqual([card]);
        });
    });

    describe('playToField results', () => {
        const dogData = (): CardData => ({
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin'
        });

        it('reports a placement with no match', () => {
            const player = new Player(0);
            const card = CardFactory.create(dogData());
            player.addToHand(card);

            expect(player.playToField(card.instanceId, 0, 0)).toEqual({ placed: true, match: null });
        });

        it('reports failure for an occupied slot and leaves no extra row behind', () => {
            const player = new Player(0);
            const first = CardFactory.create(dogData());
            const second = CardFactory.create({ ...dogData(), id: 'other_dog' });
            player.addToHand(first);
            player.addToHand(second);
            player.playToField(first.instanceId, 0, 0);

            expect(player.playToField(second.instanceId, 0, 0)).toEqual({ placed: false });
            expect(player.field).toHaveLength(1);
            expect(player.hand).toEqual([second]);
        });

        it('reports failure for a column that does not exist, without opening a row', () => {
            const player = new Player(0);
            const card = CardFactory.create(dogData());
            player.addToHand(card);

            expect(player.playToField(card.instanceId, 0, 7)).toEqual({ placed: false });
            expect(player.field).toEqual([]);
        });

        it('reports failure for a card that is not in the hand', () => {
            const player = new Player(0);
            expect(player.playToField('missing', 0, 0)).toEqual({ placed: false });
        });

        it('does not look for a twin when an upgrade is placed', () => {
            const player = new Player(0);
            const creature = CardFactory.create(dogData());
            const upgrade = CardFactory.create({ id: 'dog_basic', name: 'Same id', type: 'upgrade', upgradeType: 'defense' } as CardData);
            player.addToHand(creature);
            player.addToHand(upgrade);
            player.playToField(creature.instanceId, 0, 0);

            expect(player.playToField(upgrade.instanceId, 0, 2)).toEqual({ placed: true, match: null });
            expect((creature as CreatureCard).matched).toBe(false);
        });
    });

    describe('removeFromField', () => {
        const dog = (): CardData => ({
            id: 'dog_basic',
            name: 'Basic Dog',
            type: 'creature',
            creatureType: 'dog',
            matchingAbilityType: 'alwaysWin'
        });

        it('empties the slot and resets facedUp and matched on a creature', () => {
            const player = new Player(1, 1);
            const card = CardFactory.create(dog()) as CreatureCard;
            player.field[0][0] = card;
            card.reveal();
            card.matched = true;

            const removed = player.removeFromField(0, 0);

            expect(removed).toBe(card);
            expect(player.field[0][0]).toBeNull();
            expect(card.facedUp).toBe(false);
            expect(card.matched).toBe(false);
        });

        it('resets facedUp on an upgrade', () => {
            const player = new Player(1, 1);
            const upgrade = CardFactory.create({
                id: 'fake_1',
                name: 'Fake',
                type: 'upgrade',
                upgradeType: 'fakeUpgrade'
            });
            player.field[0][2] = upgrade;
            upgrade.reveal();

            expect(player.removeFromField(0, 2)).toBe(upgrade);
            expect(upgrade.facedUp).toBe(false);
        });

        it('returns null for an empty or out-of-range slot', () => {
            const player = new Player(1, 1);
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
            matchingAbilityType: 'alwaysWin'
        }) as CreatureCard;

        it('returns every card in the row, reset, and deletes the row', () => {
            const player = new Player(1);
            const left = dog();
            const right = dog();
            const other = dog();
            left.matched = right.matched = true;
            left.reveal();
            right.reveal();
            player.field = [[other, null, null, null], [left, right, null, null], [other, null, null, null]];

            const removed = player.removeRow(1);

            expect(removed).toEqual([left, right]);
            expect(left.matched).toBe(false);
            expect(right.facedUp).toBe(false);
            expect(player.field).toEqual([[other, null, null, null], [other, null, null, null]]);
        });

        it('deletes top and bottom rows too, leaving no empty rows', () => {
            const player = new Player(1);
            const top = dog();
            const bottom = dog();
            player.field = [[top, null, null, null], [bottom, null, null, null]];

            expect(player.removeRow(0)).toEqual([top]);
            expect(player.removeRow(0)).toEqual([bottom]);
            expect(player.field).toEqual([]);
        });

        it('returns nothing for a row that does not exist', () => {
            expect(new Player(1).removeRow(3)).toEqual([]);
        });
    });
});