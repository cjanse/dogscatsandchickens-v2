import { describe, it, expect } from "vitest";
import cardsJson from "../../assets/v1/cards.json";
import { cardBackUrl, cardFrontUrl } from "../../app/cardImages";

describe("cardFrontUrl", () => {
  it("looks the front image up by card id", () => {
    expect(cardFrontUrl({ id: "Bella_Cat" })).toBe("/assets/v1/cards/bella.jpg");
  });

  it("resolves every card in cards.json to its own image", () => {
    for (const card of cardsJson) {
      expect(cardFrontUrl(card)).toBe(`/assets/v1/cards/${card.front}`);
    }
  });

  it("falls back to the creature back for an unknown id", () => {
    expect(cardFrontUrl({ id: "nope" })).toBe("/assets/v1/cards/creature.jpg");
  });
});

describe("cardBackUrl", () => {
  it("depends on the card type", () => {
    expect(cardBackUrl({ type: "creature" })).toBe("/assets/v1/cards/creature.jpg");
    expect(cardBackUrl({ type: "upgrade" })).toBe("/assets/v1/cards/upgrade.jpg");
    expect(cardBackUrl({ type: "action" })).toBe("/assets/v1/cards/action.jpg");
  });

  it("matches the back listed in cards.json for every card", () => {
    for (const card of cardsJson) {
      expect(cardBackUrl({ type: card.type as "creature" | "upgrade" | "action" })).toBe(`/assets/v1/cards/${card.back}`);
    }
  });

  it("shows the creature back when there is no card (an empty deck)", () => {
    expect(cardBackUrl(undefined)).toBe("/assets/v1/cards/creature.jpg");
  });
});
