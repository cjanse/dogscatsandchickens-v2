import { describe, it, expect } from 'vitest';
import { GameBoard } from '../../model/game/GameBoard';
import { Player } from '../../model/game/Player';
import { CardFactory } from '../../model/cards/CardFactory';
import type { CardData } from '../../model/types/CardData';
import { Deck } from '../../model/deck/Deck';
import { DeckFactory } from '../../model/deck/DeckFactory';
import type { CreatureCard } from '../../model/cards/CreatureCard';

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

    describe('turn state', () => {
        function makeBoard() {
            const alice = new Player(0);
            const bob = new Player(1);
            return { game: new GameBoard([alice, bob], new Deck([])), alice, bob };
        }

        it('allows 1 move on a first turn and 2 afterwards', () => {
            const { game, alice } = makeBoard();
            expect(game.maxMovesPerTurn).toBe(1);
            alice.turnCount = 1;
            expect(game.maxMovesPerTurn).toBe(2);
        });

        it('movesLeft subtracts the moves used this turn', () => {
            const { game, alice } = makeBoard();
            alice.turnCount = 1;
            game.turn.useMove();
            expect(game.movesLeft).toBe(1);
        });

        it('nextTurn counts the finished turn and resets the turn state', () => {
            const { game, alice, bob } = makeBoard();
            game.turn.useMove();
            game.turn.markDrawn();
            game.turn.beginAttack({ card: CardFactory.create(dogData) as CreatureCard, row: 0, col: 0 });

            game.nextTurn();

            expect(alice.turnCount).toBe(1);
            expect(bob.turnCount).toBe(0);
            expect(game.turn.movesThisTurn).toBe(0);
            expect(game.turn.hasDrawn).toBe(false);
            expect(game.turn.turnType).toBe('reinforce');
            expect(game.turn.attackingCard).toBeNull();
        });

        it('keeps the game result across turns', () => {
            const { game } = makeBoard();
            expect(game.isGameOver).toBe(false);

            game.endGame({ state: 'tie' });
            game.nextTurn();

            expect(game.isGameOver).toBe(true);
            expect(game.result).toEqual({ state: 'tie' });
        });
    });

    it('opponentOf returns the other player', () => {
        const alice = new Player(0);
        const bob = new Player(1);
        const game = new GameBoard([alice, bob], new Deck([]));
        expect(game.opponentOf(alice)).toBe(bob);
        expect(game.opponentOf(bob)).toBe(alice);
    });

    it('discardRow sends a whole row to the discard pile, reset', () => {
        const alice = new Player(0);
        const game = new GameBoard([alice, new Player(1)], new Deck([]));
        const dog = CardFactory.create(dogData) as CreatureCard;
        dog.facedUp = true;
        alice.field[0][0] = dog;

        game.discardRow(alice, 0);

        expect(game.discardPile).toEqual([dog]);
        expect(dog.facedUp).toBe(false);
        expect(alice.field).toEqual([[null, null, null, null]]);
    });

    it('takeFromDiscard removes and returns a card, or undefined if it is not there', () => {
        const game = new GameBoard([new Player(0), new Player(1)], new Deck([]));
        const dog = CardFactory.create(dogData);
        const other = CardFactory.create(dogData);
        game.discard(dog);

        expect(game.takeFromDiscard(other)).toBeUndefined();
        expect(game.discardPile).toEqual([dog]);
        expect(game.takeFromDiscard(dog)).toBe(dog);
        expect(game.discardPile).toEqual([]);
    });

    it('adds and removes temporary effects', () => {
        const game = new GameBoard([new Player(0), new Player(1)], new Deck([]));
        const effect = { type: 'revealHand' as const, sourcePlayerId: 0, targetPlayerId: 1 };

        game.addTemporaryEffect(effect);
        expect(game.temporaryEffects).toEqual([effect]);
        game.removeTemporaryEffect(effect);
        expect(game.temporaryEffects).toEqual([]);
    });
});

const dogData: CardData = {
    id: 'dog_basic',
    name: 'Basic Dog',
    type: 'creature',
    creatureType: 'dog',
    matchingAbilityType: 'alwaysWin',
    front: 'dog_basic.jpg',
    back: 'creature.jpg'
};