# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Dogs, Cats & Chickens** is a 2-player card game (human vs. human hot-seat, or human vs. a random-move AI), rebuilt as a web app. "v1" is the original game, ported as-is. "v2" is a planned future expansion and does not exist yet.

- **Rules source of truth:** [GAME_RULES_V1.md](GAME_RULES_V1.md). If the code and that file disagree, treat it as a bug in the code (or ask the user), not a reason to change the rules doc.
- Stack: React 19 + TypeScript (strict) + Vite (aliased to `rolldown-vite`) + Vitest. There is no state library and no router.

## Commands

```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # tsc -b && vite build. tsc uses noUnusedLocals/noUnusedParameters, so unused vars fail the build
npm run lint      # eslint
npx vitest run    # run tests once (`npm test` starts watch mode)
npx vitest run src/tests/game/Player.test.ts   # run a single file
```

**Windows gotcha:** if the shell's working directory uses a lowercase drive letter (`c:\...`, which VS Code often does), Vitest reports **"No test suite found"** for every file. Run it from `C:\...` instead. In PowerShell: `Set-Location "C:\Users\Carter\programming\dogscatsandchickens-v2"; npx vitest run`.

## Git

- The default branch is **`master`**, not `main`. The remote is named **`dogscatsandchickens-v2`**, not `origin`: `git push dogscatsandchickens-v2 <branch>`.
- The `gh` CLI isn't installed. Open PRs on GitHub, or merge locally.

## Architecture (MVC)

```
src/
  model/        Domain objects. Must not import React or anything from controller/ or the views.
    cards/      Card (abstract), CreatureCard, UpgradeCard, ActionCard, CardFactory
    deck/       Deck (shuffle/draw), DeckFactory (builds from deck.json counts)
    game/       GameBoard (players, deck, discard, currentPlayerIndex, temporaryEffects, turn, result), Player (hand, field), TurnState
    rules/      Stateless game rules: Matchup (type circle), Battle, Upgrades (the upgrade stack), Matching (matched abilities), Placement (field slots)
    types/      String-literal union types (CardType, CreatureType, UpgradeType, ActionType, MatchingAbilityType, TurnType, GameResult, CardData)
  controller/
    GameController.ts   Checks moves and coordinates them (validators, pendingAction, action cards). Views talk only to this.
    AIController.ts     Picks random valid moves through GameController's public can*/play* API
  app/loadV1Assets.ts   Turns cards.json and deck.json into CardData records
  assets/v1/            cards.json (card definitions) and deck.json (copies per card id; 36 cards total)
  App.tsx               Landing page, then picks a game view
  GamePageV1.tsx            Desktop view with card images (the main view)
  GamePageV1Mobile.tsx      Vertical layout for phones
  GamePageV1Diagnostics.tsx Text-only debug view
  GamePage.tsx              Old original view, no longer imported (dead code)
  tests/                Vitest specs, mirroring model/ and controller/
public/assets/v1/cards/*.jpg   Card images, served at /assets/v1/cards/<file>
```

### Key data model conventions

- **Card identity:** `id` is the card *definition* (for example `Bella_Cat`; two physical copies share it). `instanceId` is a per-copy UUID. Matching compares `id`. All moves and lookups use `instanceId`.
- **Field layout:** `Player.field` is `(Card | null)[][]`. Each row is one creature slot laid out as `[creature, matchingTwin, upgrade (bottom), upgrade (top)]`:
  - cols 0–1 hold creatures, and a twin in the other column makes a matched pair.
  - cols 2–3 hold upgrades. Col 3 can only be filled once col 2 is filled, and **col 3 triggers first** (it is the top of the stack).
  - Take cards off the field with `Player.removeFromField(row, col)`, never `row[i] = null`. It resets `facedUp` and `matched`, so the card is clean whether it goes to the hand or the discard pile.
  - `Player.playToField` adds an empty row at the top or bottom whenever a card is placed on an edge row, so there is always an empty row to place into. `discardLosingRow` removes emptied middle rows.
- **Visibility:** `Card.facedUp` means the card is permanently revealed on the field. Temporary reveals, such as Messy Dorm, live in `GameBoard.temporaryEffects`. Views must call `controller.isCardVisibleToPlayer(card, ownerIndex)` and must not read `facedUp` directly.
- **Card images:** `Card.front` and `Card.back` hold image filenames from cards.json. The back image depends on the card type (`creature.jpg`, `upgrade.jpg`, `action.jpg`).

### Controller flow

- Turn state lives in the model. `GameBoard.turn` (a `TurnState`) holds `movesThisTurn`, `turnType`, `hasDrawn`, `attackingCard` and `allowExtraAttack`, and changes them through intent-named methods (`useMove`, `beginAttack`, ...). `GameBoard.maxMovesPerTurn` is derived (1 on a player's first turn, otherwise 2). `GameBoard.result` holds the game result and survives turns. `GameBoard.nextTurn()` counts the finished turn, passes play on and resets `turn`.
- Only `pendingAction` (two-click UI interaction state) stays in `GameController`.
- Moves that take two clicks go through `pendingAction`:
  - Hand card → `playHandCard()` sets the pending state (`powerOfTea`, `stealCard`, `creatureRevive`, and so on).
  - The second click goes to `playCard()` for the field, `interactWithOpponentCard()` for the opponent's hand, or `selectDiscardPileCard()` for the discard pile.
- Attacks: `startAttack(row, col)`, then `resolveAttack(targetRow, targetCol)`. An attack uses up the whole turn.
- Game actions return `PlayResult` (`{ success: true }` or `{ success: false, reason }`). Each `canX` validator has a matching `X` action. Views use the validators for highlighting.
- Views hold the controller in a lazy `useState` initializer and call a `forceUpdate` counter after every mutation, because nothing notifies them of state changes.
- The AI turn loop currently runs in the view's End Turn handler (`setTimeout`, then `executeAITurn()`, then `endTurn()`).

## Conventions

- New card behavior: add the literal to the right `types/*.ts` union, add the definition to `cards.json` and `deck.json`, put the rule itself in `src/model/rules/` and the move validator in `GameController`, and add a test. Cards are plain data, so don't add behavior methods to the card classes.
- Keep the model free of React and controller imports. Keep game rules out of the views.
- The tsconfig has `erasableSyntaxOnly`, so don't use constructor parameter properties (`constructor(private x: T)`) or `enum`. Use explicit fields and string unions.
- Tests construct cards through `CardFactory.create(CardData)`, which needs `front` and `back`. `GameController`'s constructor shuffles and deals 5-card hands, so tests that need an exact state must build `GameBoard` and `Player` directly or account for the deal.

## Intentional deviations from GAME_RULES_V1.md

- **Matched Dog ("Defeats Any Creature")** only adds a win against another Dog, so Dog vs Dog is no longer a stand-off. A matched Dog still loses to a Chicken. The rules doc's version was too strong. Don't "fix" this.

## TODO

Work through these in order: bugs, then MVC cleanup, then missing rules. Add a test for every bug fix so the MVC refactor has something to check against. Tick items off here as they are done.

### 0. Housekeeping
- [x] Get `npm run build` passing. (`GamePage.tsx` was renamed to `GamePageV1Diagnostics.tsx`.)
- [x] Remove the `(card as any).front` / `.back` casts in the views. `Card` already has those fields.
- [x] Rewrite the 3 outdated tests in `GameController.test.ts`. They predate the opening deal and the loss check in `endTurn`. Tests now build state with `createTestController()` in `src/tests/controller/helpers.ts` (wraps `GameController.fromBoard`).
- [x] Get `npm run lint` passing. (Views create the controller with a lazy `useState` initializer instead of `useRef`.)
- [x] Update the README folder structure. Images now live in `public/assets/v1/cards/`.

### 1. Bugs
- [x] **Messy Dorm + End Turn:** `endTurn` resets `movesThisTurn` to 0, then `resetTemporaryEffectsIfNeeded` → `clearRevealIfNeeded` adds 1 back. The next player starts with a move already used and can't draw or attack.
- [x] **Discard pile:** the guard in `selectDiscardPileCard` is inverted (`!canInteract && selectedCardId != null`). Clicking a card with nothing selected still uses a move.
- [x] **Moves counted too early:** `selectDiscardPileCard` and `interactWithOpponentCard` add to `movesThisTurn` before checking that the action worked.
- [x] **Recovery turn:** `canDrawCard` requires `movesThisTurn == 0`. After a recovery move puts a creature on the field, the player can never draw.
- [x] **Fake Upgrade** is discarded. It should go back to its owner's hand, unless a Revive or Self-Destruct also triggers (or its creature attacks and loses), in which case it is discarded.
- [x] **Counter Attack** behaves exactly like Defense. It should also defeat the attacker when the defender's type beats the attacker's. (Implemented in `model/rules/Upgrades.ts`. It can't fire in a real game under the matched-Dog deviation below, since an attacker then only wins on type or as a matched Dog against a Dog.)
- [x] **Revive** returns cards to the hand still marked `matched` (and `facedUp`). Reset both whenever a card leaves the field. (Done in the model: `Player.removeFromField` calls `Card.resetFieldState()`.)
- [x] **AI turn loop:** the AI ignores the first-turn rule and the recovery-turn draw.

### 2. MVC cleanup
- [x] Move turn state (`movesThisTurn`, `maxMovesPerTurn`, `turnType`, `hasDrawn`, `attackingCard`, `allowExtraAttack`, `gameResult`) from `GameController` into the model, for example a `TurnState` held by `GameBoard`. (`TurnState` on `GameBoard.turn`; `gameResult` is `GameBoard.result` so it survives the per-turn reset; `maxMovesPerTurn` is derived from `turnCount`.)
- [x] Move the game rules (battles, upgrade resolution, matching abilities) out of `GameController` into model services or classes. The controller should only check moves and coordinate them. Either implement or delete the empty `Card.canPlay`/`onPlay` stubs. Then remove the unused `_` parameters and the `argsIgnorePattern` exception in `eslint.config.js`. (Rules and placement checks live in `src/model/rules/`; the stubs were deleted. Action-card effects are still in the controller, since they are tied to `pendingAction`.)
- [ ] Stop exposing editable model internals:
  - Make `getGameState()` actually read-only, or return a view model.
  - Replace direct `hand.push`, `discardPile.splice` and `row[i] = null` with model methods.
  - Remove `Deck.deck` (the debug getter), which the view reads.
- [ ] Take display details out of the model: image filenames (`front`/`back`) should come from a view-side lookup by card `id`, and the empty placeholder rows on the field should be a UI concern.
- [ ] Make controller method signatures consistent: indexes vs `Player`/`Card` objects, and no raw `selectedCardId` coming from the UI.
- [ ] Move the AI turn loop out of the views' End Turn handlers and into the controller.
- [ ] Move the "start an attack or place a card?" click logic out of the views into the controller.
- [ ] Remove the copied logic between `GamePageV1`, `GamePageV1Mobile` and `GamePageV1Diagnostics`. Use a shared `useGameController` hook that re-renders when the controller notifies it, so views don't need `forceUpdate`. Views should only do layout.
- [ ] Replace `alert()` with in-UI messages, and remove `console.log` from the controller.

### 3. Missing rules
- [ ] **Win condition:** the opponent has no creatures on the field or in their hand. A `win` result is never set yet, and the end screen only shows a loss.
- [ ] **Matched Chicken:** while the pair is face up, the opponent's newly played creatures and upgrades must go down face up. Only the one-time reveal exists.
- [ ] **Power of Tea:** revealing one card of a matched pair should flip both, and revealing a matched Chicken should trigger its ability.
- [ ] **Matching:** a pair should stay face down until the player chooses to activate it, which costs no move. Right now it reveals and activates as soon as it is made. Activation is automatic only if the bottom creature was already face up.
- [ ] **Matched Cat:** only the same Cat should be allowed to keep attacking. Right now any matched Cat can.
- [x] **First turn:** only a creature may be played.
- [ ] **Setup:** deal 3 random creatures and then 2 more cards. Right now the controller redraws whole 5-card hands until one has at least 3 creatures.
- [x] **Draw first:** the player must draw before making any move.
