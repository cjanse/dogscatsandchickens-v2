import { GameController } from "../../controller/GameController";
import { CardFactory } from "../../model/cards/CardFactory";
import type { Card } from "../../model/cards/Card";
import type { CreatureCard } from "../../model/cards/CreatureCard";
import { Deck } from "../../model/deck/Deck";
import { GameBoard } from "../../model/game/GameBoard";
import { Player } from "../../model/game/Player";
import type { CreatureType } from "../../model/types/CreatureType";
import type { ActionType } from "../../model/types/ActionType";
import type { UpgradeType } from "../../model/types/UpgradeType";
import type { MatchingAbilityType } from "../../model/types/MatchingAbilityType";

/** Builds a creature card. Copies with the same `id` can match each other. */
export function makeCreature(
  id = "test_dog",
  creatureType: CreatureType = "dog",
  matchingAbilityType: MatchingAbilityType = "alwaysWin"
): CreatureCard {
  return CardFactory.create({
    id,
    name: id,
    type: "creature",
    creatureType,
    matchingAbilityType,
  }) as CreatureCard;
}

/**
 * Marks two twins as a matched pair, as `formPair` does. With `active`, both also flip face up, so the
 * pair's ability is on. Without it the pair is face down and waiting to be activated.
 */
export function matchPair(a: CreatureCard, b: CreatureCard, { active }: { active: boolean }): void {
  a.matched = true;
  b.matched = true;
  if (active) {
    a.reveal();
    b.reveal();
  }
}

export function makeAction(id: string, actionType: ActionType): Card {
  return CardFactory.create({
    id,
    name: id,
    type: "action",
    actionType,
  });
}

export function makeUpgrade(id = "test_defense", upgradeType: UpgradeType = "defense"): Card {
  return CardFactory.create({
    id,
    name: id,
    type: "upgrade",
    upgradeType,
  });
}

export interface TestGameSetup {
  /** Cards in the deck. The last card is drawn first. Default: empty. */
  deck?: Card[];
  /** Starting hand per player. Default: empty. */
  hands?: [Card[], Card[]];
  /** Cards placed in each player's first field row, starting at column 0. An empty list means an empty field (no rows). */
  fields?: [Card[], Card[]];
  /** Which player moves first. Default: 0. */
  currentPlayerIndex?: number;
  /** Turns already taken per player. Default: [1, 1], i.e. past the one-move first turn. */
  turnCounts?: [number, number];
  player2IsAI?: boolean;
}

/**
 * Builds a GameController around a known GameBoard, skipping the random
 * opening deal. Players default to having one creature on the field (a Dog for
 * player 0, a Cat for player 1) so the loss and tie checks in endTurn don't end the game.
 */
export function createTestController(setup: TestGameSetup = {}) {
  const players = [
    new Player(0, 0, 4, false),
    new Player(1, 0, 4, setup.player2IsAI ?? false),
  ];
  const turnCounts = setup.turnCounts ?? [1, 1];
  // Different creature types, so an empty deck doesn't immediately end the game in a tie
  const fields = setup.fields ?? [[makeCreature()], [makeCreature("test_cat", "cat")]];

  players.forEach((player, i) => {
    player.turnCount = turnCounts[i];
    setup.hands?.[i].forEach(card => player.addToHand(card));
    // The field only holds rows that have cards in them
    if (fields[i].length > 0) {
      player.field = [Array.from({ length: 4 }, (_, col) => fields[i][col] ?? null)];
    }
  });

  const game = new GameBoard(players, new Deck(setup.deck ?? []));
  game.currentPlayerIndex = setup.currentPlayerIndex ?? 0;

  const controller = GameController.fromBoard(game);
  return { controller, game, players };
}
