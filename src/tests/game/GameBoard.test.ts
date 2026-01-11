import { describe, it, expect } from 'vitest';
import { GameBoard } from '../../model/game/GameBoard';
import { Player } from '../../model/game/Player';
import { CardFactory } from '../../model/cards/CardFactory';
import type { CardData } from '../../model/types/CardData';
import type { Deck } from '../../model/deck/Deck';
import { DeckFactory } from '../../model/deck/DeckFactory';

describe('GameBoard', () => {
    it('initializes with two players', () => {
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
        const alice = new Player(0);
        const bob = new Player(1);
        const game = new GameBoard([alice, bob], deck);

        expect(game.players.length).toBe(2);
        expect(game.currentPlayer).toBe(alice);
    });

    it('switches turns correctly', () => {
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
        const alice = new Player(0);
        const bob = new Player(1);
        const game = new GameBoard([alice, bob], deck);

        expect(game.currentPlayer).toBe(alice);
        game.nextTurn();
        expect(game.currentPlayer).toBe(bob);
        game.nextTurn();
        expect(game.currentPlayer).toBe(alice);
    });

    it('can track cards on the board', () => {
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
        const alice = new Player(0);
        const bob = new Player(1);
        const game = new GameBoard([alice, bob], deck);

        const data: CardData = {
            id: 'upgrade_basic',
            name: 'Basic Upgrade',
            type: 'upgrade',
            upgradeType: 'revive',
            front: 'upgrade_basic.jpg',
            back: 'upgrade.jpg'
        };
        const card = CardFactory.create(data);
        alice.addToHand(card);
        alice.playToField(card.instanceId, 0, 0);
        expect(game.players[0].field[1][0]).toBe(card); //Expect card to be in first row due to expandFieldIfNeeded functionality
        expect(game.players[0].hand.length).toBe(0);
    });
});