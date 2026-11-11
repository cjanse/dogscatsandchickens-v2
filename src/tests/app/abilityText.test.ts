import { describe, it, expect } from "vitest";
import { abilityText } from "../../app/abilityText";
import type { MatchingAbilityType } from "../../model/types/MatchingAbilityType";

describe("abilityText", () => {
  it("names and describes every matched ability", () => {
    const abilities: MatchingAbilityType[] = ["multipleAttacks", "alwaysWin", "seeEverything"];
    for (const ability of abilities) {
      expect(abilityText(ability).name).toBeTruthy();
      expect(abilityText(ability).description).toBeTruthy();
    }
  });

  it("looks the text up by ability type", () => {
    expect(abilityText("seeEverything").name).toBe("Opponent Must Have All Face-Up Cards");
  });
});
