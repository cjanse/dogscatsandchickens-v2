import { GameController } from "../../controller/GameController";
import { CardFactory } from "../../model/cards/CardFactory";
import type { Card } from "../../model/cards/Card";
import type { CreatureCard } from "../../model/cards/CreatureCard";
import { Deck } from "../../model/deck/Deck";
import { GameBoard } from "../../model/game/GameBoard";
import { Player } from "../../model/game/Player";
import type { CreatureType } from "../../model/types/CreatureType";

/** Builds a creature card. Copies with the same `id` can match each other. */
export function makeCreature(
  id = "test_dog",
  creatureType: CreatureType = "dog"
): CreatureCard {
  return CardFactory.create({
    id,
    name: id,
    type: "creature",
    creatureType,
    matchingAbilityType: "alwaysWin",
    front: "front.jpg",
    back: "creature.jpg",
  }) as CreatureCard;
}

export interface TestGameSetup {
  /** Cards in the deck. The last card is drawn first. Default: empty. */
  deck?: Card[];
  /** Starting hand per player. Default: empty. */
  hands?: [Card[], Card[]];
  /** Cards placed in each player's first field row, starting at column 0. */
  fields?: [Card[], Card[]];
  /** Which player moves first. Default: 0. */
  currentPlayerIndex?: number;
  /** Turns already taken per player. Default: [1, 1], i.e. past the one-move first turn. */
  turnCounts?: [number, number];
  player2IsAI?: boolean;
}

/**
 * Builds a GameController around a known GameBoard, skipping the random
 * opening deal. Players default to having one creature on the field so the
 * loss check in endTurn doesn't end the game.
 */
export function createTestController(setup: TestGameSetup = {}) {
  const players = [
    new Player(0, 1, 4, false),
    new Player(1, 1, 4, setup.player2IsAI ?? false),
  ];
  const turnCounts = setup.turnCounts ?? [1, 1];
  const fields = setup.fields ?? [[makeCreature()], [makeCreature()]];

  players.forEach((player, i) => {
    player.turnCount = turnCounts[i];
    setup.hands?.[i].forEach(card => player.addToHand(card));
    fields[i].forEach((card, col) => {
      player.field[0][col] = card;
    });
  });

  const game = new GameBoard(players, new Deck(setup.deck ?? []));
  game.currentPlayerIndex = setup.currentPlayerIndex ?? 0;

  const controller = GameController.fromBoard(game);
  return { controller, game, players };
}
