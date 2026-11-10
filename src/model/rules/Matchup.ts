import type { CreatureCard } from "../cards/CreatureCard";
import type { CreatureType } from "../types/CreatureType";

/** Dogs chase Cats, Cats chase Chickens, Chickens chase Dogs. */
const BEATS: Record<CreatureType, CreatureType> = {
  dog: "cat",
  cat: "chicken",
  chicken: "dog",
};

export function typeBeats(a: CreatureType, b: CreatureType): boolean {
  return BEATS[a] === b;
}

/**
 * The attacker wins on type, or as a matched Dog against another Dog. The matched Dog
 * only gains the Dog-vs-Dog win, an intentional deviation from the rules doc (see CLAUDE.md).
 */
export function attackerWins(attacker: CreatureCard, defender: CreatureCard): boolean {
  if (typeBeats(attacker.creatureType, defender.creatureType)) return true;
  return attacker.matched && attacker.creatureType === "dog" && defender.creatureType === "dog";
}

export function defenderWins(attacker: CreatureCard, defender: CreatureCard): boolean {
  return typeBeats(defender.creatureType, attacker.creatureType);
}
