import type { CardData } from "../types/CardData";
import { ActionCard } from "./ActionCard";
import type { Card } from "./Card";
import { CreatureCard } from "./CreatureCard";
import { UpgradeCard } from "./UpgradeCard";

export class CardFactory {
    static create(data: CardData): Card {
        switch (data.type) {
            case "creature":
                return new CreatureCard(
                    data.id,
                    data.name,
                    data.front,
                    data.back,
                    data.creatureType!,
                    data.matchingAbilityType!
                );
            case "upgrade":
                return new UpgradeCard(
                    data.id,
                    data.name,
                    data.front,
                    data.back,
                    data.upgradeType!
                );
            case "action":
                return new ActionCard(
                    data.id,
                    data.name,
                    data.front,
                    data.back,
                    data.actionType!
                );
        }
    }
}
