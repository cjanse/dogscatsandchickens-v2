import abilitiesJson from "../assets/v1/abilities.json";
import type { MatchingAbilityType } from "../model/types/MatchingAbilityType";

export interface AbilityText {
  name: string;
  description: string;
}

/**
 * What each matched ability is called and does, from abilities.json (v1 content, like cards.json).
 * The type annotation makes the build fail if the file is missing an ability.
 */
const ABILITIES: Record<MatchingAbilityType, AbilityText> = abilitiesJson;

/** The name and description of a matched ability. Ask the controller which ability a pair has (`getPairAbility`). */
export function abilityText(ability: MatchingAbilityType): AbilityText {
  return ABILITIES[ability];
}
