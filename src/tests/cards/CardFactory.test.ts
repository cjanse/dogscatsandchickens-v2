import { describe, it, expect } from 'vitest';
import { CardFactory } from '../../model/cards/CardFactory';
import type { CardData } from '../../model/types/CardData';
import { ActionCard } from '../../model/cards/ActionCard';
import { CreatureCard } from '../../model/cards/CreatureCard';
import { UpgradeCard } from '../../model/cards/UpgradeCard';

describe('CardFactory', () => {
  it('should create a ActionCard from CardData', () => {
    const data: CardData = {
      id: 'action_basic',
      name: 'Basic Action',
      type: 'action',
      actionType: 'spirit',
      front: 'action_basic.jpg',
      back: 'action.jpg'
    };

    const card = CardFactory.create(data);

    expect(card).toBeInstanceOf(ActionCard);
    expect(card.name).toBe('Basic Action');
    expect((card as ActionCard).actionType).toBe("spirit");
  });
});

describe('CardFactory', () => {
  it('should create a CreatureCard from CardData', () => {
    const data: CardData = {
      id: 'creature_basic',
      name: 'Basic Creature',
      type: 'creature',
      creatureType: 'cat',
      matchingAbilityType: 'alwaysWin',
      front: 'creature_basic.jpg',
      back: 'creature.jpg'
    };

    const card = CardFactory.create(data);

    expect(card).toBeInstanceOf(CreatureCard);
    expect(card.name).toBe('Basic Creature');
    expect((card as CreatureCard).creatureType).toBe("cat");
    expect((card as CreatureCard).matchingAbilityType).toBe("alwaysWin");
  });
});

describe('CardFactory', () => {
  it('should create an UpgradeCard from CardData', () => {
    const data: CardData = {
      id: 'upgrade_basic',
      name: 'Basic Upgrade',
      type: 'upgrade',
      upgradeType: 'revive',
      front: 'upgrade_basic.jpg',
      back: 'upgrade.jpg'
    };

    const card = CardFactory.create(data);

    expect(card).toBeInstanceOf(UpgradeCard);
    expect(card.name).toBe('Basic Upgrade');
    expect((card as UpgradeCard).upgradeType).toBe("revive");
  });
});