import cardsJson from "../assets/v1/cards.json";
import type { CardType } from "../model/types/CardType";

/**
 * Card images are a display detail, so the model doesn't know about them.
 * Fronts are looked up by card definition `id` (from cards.json); backs depend on the card type.
 */

const IMAGE_DIR = "/assets/v1/cards/";

const fronts: Record<string, string> = {};
for (const card of cardsJson) {
  fronts[card.id] = card.front;
}

const backs: Record<CardType, string> = {
  creature: "creature.jpg",
  upgrade: "upgrade.jpg",
  action: "action.jpg",
};

export function cardFrontUrl(card: { id: string }): string {
  return IMAGE_DIR + (fronts[card.id] ?? backs.creature);
}

export function cardBackUrl(card: { type: CardType } | undefined): string {
  return IMAGE_DIR + backs[card?.type ?? "creature"];
}
