import type { CardData } from "../model/types/CardData";
import cardsJson from "../assets/v1/cards/cards.json";
import deckJson from "../assets/v1/cards/deck.json";
import type { UpgradeType } from "../model/types/UpgradeType";
import type { MatchingAbilityType } from "../model/types/MatchingAbilityType";
import type { ActionType } from "../model/types/ActionType";
import type { CardType } from "../model/types/CardType";
import type { CreatureType } from "../model/types/CreatureType";

export function loadV1Assets() {
  const cardDefs: Record<string, CardData> = {};

  for (const raw of cardsJson) {
    const card: CardData = {
        ...raw,
        type: raw.type as CardType,
        creatureType: raw.creatureType as CreatureType,
        actionType: raw.actionType as ActionType,
        upgradeType: raw.upgradeType as UpgradeType,
        matchingAbilityType: raw.matchingAbilityType as MatchingAbilityType
    };
    cardDefs[card.id] = card as CardData;
  }

  return {
    cardDefs,
    deckConfig: deckJson
  };
}