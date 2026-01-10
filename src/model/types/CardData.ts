import type { CardType } from "./CardType";
import type { CreatureType } from "./CreatureType";
import type { UpgradeType } from "./UpgradeType";
import type { ActionType } from "./ActionType";
import type { MatchingAbilityType } from "./MatchingAbilityType";

export type CardData = {
    id: string;
    name: string;
    type: CardType;

    // creature-only fields
    creatureType?: CreatureType;
    matchingAbilityType?: MatchingAbilityType;

    // upgrade-only fields
    upgradeType?: UpgradeType;

    // action-only fields
    actionType?: ActionType;

    // shared asset info
    front: string;
    back: string;
};