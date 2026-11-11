import { describe, it, expect } from 'vitest';
import { CardFactory } from '../../model/cards/CardFactory';
import { Player } from '../../model/game/Player';
import type { CardData } from '../../model/types/CardData';

const dog = (): CardData => ({
  id: 'dog_basic',
  name: 'Basic Dog',
  type: 'creature',
  creatureType: 'dog',
  matchingAbilityType: 'alwaysWin',
});

describe('Card face-up state', () => {
  it('starts face down, and reveal/hide flip it', () => {
    const card = CardFactory.create(dog());
    expect(card.facedUp).toBe(false);
    card.reveal();
    expect(card.facedUp).toBe(true);
    card.hide();
    expect(card.facedUp).toBe(false);
  });

  it('resetFieldState turns it face down', () => {
    const card = CardFactory.create(dog());
    card.reveal();
    card.resetFieldState();
    expect(card.facedUp).toBe(false);
  });

  it('is hidden when it is added to a hand', () => {
    const card = CardFactory.create(dog());
    card.reveal();
    new Player(0).addToHand(card);
    expect(card.facedUp).toBe(false);
  });
});
