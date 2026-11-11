# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Dogs, Cats & Chickens** is a 2-player card game, played as human vs. a random-move AI, rebuilt as a web app. A human vs. human hot-seat mode is planned: the controller already supports it, but the UI can't start one yet (see TODO, section 4). "v1" is the original game, ported as-is. "v2" is a planned future expansion and does not exist yet.

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
    rules/      Stateless game rules: Matchup (type circle), Battle, Upgrades (the upgrade stack), Matching (matched abilities), Placement (field slots), HandLimit (`HAND_LIMIT`, `isOverHandLimit`), GameEnd (`lossResult`, `tieResult`), Setup (`setUpGame`, the opening deal), Actions (what each action card does and when it can be played, `isPlayableCard`), Visibility (`isCardVisible`: who can see a card)
    types/      String-literal union types (CardType, CreatureType, UpgradeType, ActionType, MatchingAbilityType, TurnType, GameResult, CardData)
  controller/
    GameController.ts   Checks moves and coordinates them (validators, pendingAction, the selected card, action cards, click routing, the AI's turns). Views talk only to this. getGameState() returns a read-only GameView; public methods take PlayerView and Card objects (never indexes or instanceId strings) and look up the real Player by id.
    AIController.ts     Picks random valid moves through GameController's public can*/play* API. GameController creates it and runs it from finishTurn()
  app/loadV1Assets.ts   Turns cards.json and deck.json into CardData records (no image info)
  app/cardImages.ts     View-side image lookup: cardFrontUrl(card) by id, cardBackUrl(card) by type
  app/fieldRows.ts      fieldRowsWithPlaceholders(field): adds the empty rows the UI draws above and below the field. visualCells/columnsInUse: which cells a row shows, in screen order, with their model column
  app/useGameController.ts  The views' only way in: creates the controller, re-renders on its notifications, wraps actions and keeps the last failure as `message`
  view/components/      Shared view pieces (FieldCell, CardImage, DeckPile, DiscardPile, TurnControls, MessageBanner, GameOverScreen). Game behavior inside, size and style from props
  assets/v1/            cards.json (card definitions) and deck.json (copies per card id; 36 cards total)
  App.tsx               Landing page, then picks a game view (always against the AI for now)
  GamePageV1.tsx            Desktop view with card images (the main view)
  GamePageV1Mobile.tsx      Vertical layout for phones
  GamePageV1Diagnostics.tsx Text-only debug view
  tests/                Vitest specs, mirroring model/ and controller/
public/assets/v1/cards/*.jpg   Card images, served at /assets/v1/cards/<file>
```

### Key data model conventions

- **Card identity:** `id` is the card *definition* (for example `Bella_Cat`; two physical copies share it). `instanceId` is a per-copy UUID. Matching compares `id`. All moves and lookups use `instanceId`.
- **Field layout:** `Player.field` is `(Card | null)[][]`. Each row is one creature slot laid out as `[creature, matchingTwin, upgrade (bottom), upgrade (top)]`:
  - cols 0–1 hold creatures, and a twin in the other column makes a matched pair.
  - cols 2–3 hold upgrades. Col 3 can only be filled once col 2 is filled, and **col 3 triggers first** (it is the top of the stack).
  - Take cards off the field with `Player.removeFromField(row, col)`, never `row[i] = null`. It resets `facedUp` and `matched`, so the card is clean whether it goes to the hand or the discard pile.
  - `Player.field` only holds rows that have cards in them (it starts as `[]`). To play a creature into a new row, pass `row = -1` (new row above all rows) or `row = field.length` (new row below); `Player.playToField` opens the row. For an empty field only `row = 0` is valid. `Player.removeRow` always deletes the row. The empty "drop here" rows the UI shows come from `fieldRowsWithPlaceholders` in `src/app/fieldRows.ts`, which gives each row its model index (-1 and `field.length` for the placeholders).
- **Visibility:** `Card.facedUp` means the card is permanently revealed on the field. It only changes through `Card.reveal()` and `hide()` (`resetFieldState()` and `Player.addToHand` hide a card, so a card in a hand is never face up). Temporary reveals, such as Messy Dorm, live in `GameBoard.temporaryEffects`. Views must call `isCardVisibleToPlayer(card, owner)` (`owner` is the `PlayerView` whose hand or field holds the card) and `isFaceUp(card)` (to dim your own face-down cards), and must not read `facedUp` directly. `CardImage` does both.
- **Cards in views:** views get `CardView`s (`model/game/views.ts`: read-only `id`, `name`, `type`, `instanceId`, `facedUp`), never `Card` objects. When a view hands a card back, the controller finds the real card by `instanceId` (`handCard`, `discardCard`).
- **Viewer vs. current player:** visibility is decided for `getViewer()`, the player whose side the screen shows, not for the current player. Against the AI the viewer is always the human, so the AI's hand stays hidden during its turn. In hot-seat (not reachable from the UI yet) the viewer is the current player. Views draw "you" from `viewer` and never from `game.currentPlayerIndex`.
- **AI turns are hands-off:** while `isHumanTurn()` is false, the click-level entry points (`clickField`, `clickHandCard`, `clickDeck`, `interactWithOpponentCard`, `selectDiscardPileCard`, `finishTurn`) return "Wait for the AI to finish its turn", and `canClickField`/`canClickDeck`/`canFinishTurn` are false. The AI never calls those methods, only the lower-level ones (`drawCard`, `playCard`, `startAttack`, ...), so don't add the guard there. The hook also ignores every action when `isMyTurn` is false.
- **Card images:** the model has no image info. Views use `cardFrontUrl(card)` (looked up by `id` in cards.json) and `cardBackUrl(card)` (depends on the card type: `creature.jpg`, `upgrade.jpg`, `action.jpg`) from `src/app/cardImages.ts`.

### Controller flow

- Turn state lives in the model. `GameBoard.turn` (a `TurnState`) holds `movesThisTurn`, `turnType`, `hasDrawn`, `attackingCard` and `allowExtraAttack`, and changes them through intent-named methods (`useMove`, `beginAttack`, ...). `GameBoard.maxMovesPerTurn` is derived (1 on a player's first turn, otherwise 2). `GameBoard.result` holds the game result and survives turns. `GameBoard.nextTurn()` counts the finished turn, passes play on and resets `turn`.
- Two-click UI interaction state stays in `GameController`: `pendingAction` (what the picked-up action card does) and the selected hand card. The UI never passes a card id back: `getSelectedCard()` is what the view highlights (the attacker while an attack is pending, otherwise the picked-up hand card).
- Views call these click-level entry points, and the controller decides what a click means:
  - Hand card → `clickHandCard(player, card)`: discards it in the discard phase, deselects it if it is already selected, otherwise `selectHandCard()`. That stores it as the selected card, and an action card also sets `pendingAction` (`powerOfTea`, `stealCard`, `creatureRevive`, and so on).
  - Field cell → `clickField(owner, row, col)` (highlight with `canClickField`): resolves a pending attack, starts an attack (the first move of a turn, or a matched Cat attacking again), resolves Power of Tea, or places the selected creature or upgrade.
  - The opponent's hand → `interactWithOpponentCard(player, card)`, and the discard pile → `selectDiscardPileCard(card)`. Both act for the selected action card, and the controller discards it when the action resolves.
- Lower-level actions the AI and tests use: `playCard(player, card, row, col)` and `canPlayCard` (creature and upgrade placement only), `startAttack(row, col)` then `resolveAttack(targetRow, targetCol)` (an attack uses up the whole turn), `drawCard()` (humans draw through `clickDeck()`, which refuses during the AI's turn). Methods that can only act for the current player take no player argument.
- Game actions return `PlayResult` (`{ success: true }` or `{ success: false, reason }`). Each `canX` validator has a matching `X` action. Views use the validators for highlighting.
- The AI's turns run in the controller. The End Turn button calls `finishTurn()`: it calls `endTurn()` (which stays synchronous) and, if an AI player is next, schedules `AIController.executeAITurn()` plus `endTurn()` after `aiTurnDelayMs` (500 ms), repeating until a human is up or the game ends. `dispose()` cancels a pending AI turn.
- **Notifications:** every public controller method that can change state runs inside `withNotify`, which calls the `subscribe` listeners and bumps `getVersion()` once, also when the action fails. Nested calls (`clickField` → `playCard`) and a whole AI turn notify only once. Queries (`can*`, `is*`, `get*`) never notify. A new mutator must be wrapped too, or views won't re-render after it.
- **Views:** each view calls `useGameController()` (`src/app/useGameController.ts`). It builds the controller once, re-renders through `useSyncExternalStore(subscribe, getVersion)`, and calls `dispose()` on unmount. Views get `viewer`, `opponent` (the viewer's), `isMyTurn` and `queries` (the controller typed down to its read-only methods, `GameQueries`), and act only through the hook's wrappers (`clickField`, `clickHandCard`, `drawCard` (which calls `clickDeck`), `finishTurn`, ...), which put a failed action's `reason` in `message` (shown by `MessageBanner`) and clear it on the next success. No `alert()`, no `forceUpdate`. A new query must be added to `GameQueries` before views can use it.
- **No `React.memo`** on components that take `controls`, the game, players or cards: they are the same mutable objects on every render, so a memoized component would never update.

## Conventions

- New card behavior: add the literal to the right `types/*.ts` union, add the definition to `cards.json` and `deck.json`, put the rule itself in `src/model/rules/` and the move validator in `GameController`, and add a test. Cards are plain data, so don't add behavior methods to the card classes.
- Keep the model free of React and controller imports.
- Where code goes:
  - **What the rules say** (legal placements, battle outcomes, card effects, end-of-game checks, who can see a card) goes in `src/model/rules/`, as functions of the model.
  - **Whether a move is allowed right now, and in what order things happen** goes in `GameController`.
  - **Views and `useGameController`** only lay things out and pass clicks on. They never combine queries into a rule. If a view needs a yes/no, add a controller query (and add it to `GameQueries`).
  - Known exceptions are listed as open items under "2. MVC cleanup" below. Don't add new ones.
- The tsconfig has `erasableSyntaxOnly`, so don't use constructor parameter properties (`constructor(private x: T)`) or `enum`. Use explicit fields and string unions.
- Tests construct cards through `CardFactory.create(CardData)`. `GameController`'s constructor shuffles and deals 5-card hands, so tests that need an exact state must build `GameBoard` and `Player` directly or account for the deal.

## Intentional deviations from GAME_RULES_V1.md

- **Matched Dog ("Defeats Any Creature")** only adds a win against another Dog, so Dog vs Dog is no longer a stand-off. A matched Dog still loses to a Chicken. The rules doc's version was too strong. Don't "fix" this.

## TODO

Work through these in order: bugs, then MVC cleanup, then missing rules, then new features. [TODO_PLAN.md](TODO_PLAN.md) groups them into batches. Add a test for every bug fix so the MVC refactor has something to check against. Tick items off here as they are done.

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
- [x] **Cancelled attack leaves turn state behind:** if a player starts an attack and then clicks a hand card, `selectHandCard` → `resetTemporaryEffectsIfNeeded` clears `pendingAction` but leaves `turn.attackingCard` set and `turnType` at `"attack"`. The only visible effect today is "Turn: attack" after the player places a card. Clear the attack in `TurnState` when the pending attack is dropped. `turnType` should go back to `"reinforce"` unless an attack already resolved this turn (a matched Cat). (`TurnState.cancelAttack()`, called from `resetTemporaryEffectsIfNeeded`.)
- [x] **Power of Tea could target a face-up card:** `canUsePowerOfTea` only checked that the cell wasn't empty, so the Tea card could be spent on a card that was already revealed. The rules say a face-down card. (`canRevealWithTea` in `rules/Actions.ts`; found in M8.)

### 2. MVC cleanup
- [x] Move turn state (`movesThisTurn`, `maxMovesPerTurn`, `turnType`, `hasDrawn`, `attackingCard`, `allowExtraAttack`, `gameResult`) from `GameController` into the model, for example a `TurnState` held by `GameBoard`. (`TurnState` on `GameBoard.turn`; `gameResult` is `GameBoard.result` so it survives the per-turn reset; `maxMovesPerTurn` is derived from `turnCount`.)
- [x] Move the game rules (battles, upgrade resolution, matching abilities) out of `GameController` into model services or classes. The controller should only check moves and coordinate them. Either implement or delete the empty `Card.canPlay`/`onPlay` stubs. Then remove the unused `_` parameters and the `argsIgnorePattern` exception in `eslint.config.js`. (Rules and placement checks live in `src/model/rules/`; the stubs were deleted. Action-card effects are still in the controller, since they are tied to `pendingAction`.)
- [x] Stop exposing editable model internals. (`getGameState()` returns a `GameView` of readonly interfaces from `model/game/views.ts` (`GameView`, `PlayerView`, `DeckView`, `FieldView`, `CardView`), which the model classes implement. The controller changes the model through `addToHand`, `GameBoard.takeFromDiscard` and `add/removeTemporaryEffect`. `Deck.deck` is gone; use `Deck.peek()`. 
- [x] Take display details out of the model: image filenames (`front`/`back`) should come from a view-side lookup by card `id`, and the empty placeholder rows on the field should be a UI concern.
- [x] Make controller method signatures consistent: indexes vs `Player`/`Card` objects, and no raw `selectedCardId` coming from the UI. (Players are `PlayerView`s and cards are `Card`s everywhere. The controller owns the selected card, so `interactWithOpponentCard` and `selectDiscardPileCard` no longer take an id. `drawCard` returns a `PlayResult`.)
- [x] Move the AI turn loop out of the views' End Turn handlers and into the controller. (`finishTurn()`, `subscribe()` and `dispose()`.)
- [x] Move the "start an attack or place a card?" click logic out of the views into the controller. (`clickField`, `canClickField` and `clickHandCard`. `canPlayCard` is now creature/upgrade placement only.)
- [x] Remove the copied logic between `GamePageV1`, `GamePageV1Mobile` and `GamePageV1Diagnostics`. Use a shared `useGameController` hook that re-renders when the controller notifies it, so views don't need `forceUpdate`. Views should only do layout. (`src/app/useGameController.ts` plus `src/view/components/`. Mobile now shows your own face-down field cards dimmed instead of as card backs, like desktop.)
- [x] Replace `alert()` with in-UI messages, and remove `console.log` from the controller. (`MessageBanner`; the controller had no `console.log` left.)

Follow-ups from the M1–M6 review, where the code still breaks the "Where code goes" convention:
- [x] **Hand limit only checked in the hook:** "discard down to 5 before ending your turn" is enforced only by `canFinishTurn: !hasExtraHandCards && …` in `useGameController.ts`. `endTurn()` and `finishTurn()` accept a hand of 6 or more. Put the limit in the model (a `HAND_LIMIT` constant), make `canEndTurn`/`endTurn` refuse while the hand is over it, and give the hook controller queries for "can finish" and "show Discard Extra" so it stops combining them. The AI already discards before it ends its turn. (`HAND_LIMIT` in `rules/HandLimit.ts`; `canEndTurn`/`endTurn` refuse while over it, and the hook uses `canFinishTurn()` and `canStartDiscardPhase()`.)
- [x] **End-of-game checks in the controller:** `checkLossCondition`, `checkTieCondition`, `playerHasCreatures`, `allCreaturesSameType` and `playerHasPlayableHand` are rules. Move them to `src/model/rules/` (for example `GameEnd.ts`) as functions of the board that return a `GameResult`. The controller calls them at the end of a turn and records the result with `GameBoard.endGame`. The tie check uses the controller's `canPlayHandCard`, so either pass that in as a predicate or check only whether the cards could be placed. (`rules/GameEnd.ts` takes the predicate. The controller's `canPlayHandCard` only accepts the current player, so the tie check in practice looks at the hand of the player about to move. M8 replaced the predicate: `tieResult(game)` now checks both hands with the model's `isPlayableCard`, as the rules say "neither player can play".)
- [x] **Opening deal in the controller:** `dealStartingHand` should live in the model (for example `rules/Setup.ts`), so the Setup rule in section 3 changes a model function. (`rules/Setup.ts`: `setUpGame`, `dealStartingHand`. Behavior unchanged. The deal's `facedUp` write now happens in the model.)
- [x] **Action-card effects in the controller:** the steal (including its random pick), Spirit revives from the discard pile, the Power of Tea reveal, the Messy Dorm reveal effect and `canPlayHandAction`'s conditions should move to `src/model/rules/` (for example `Actions.ts`). The controller keeps `pendingAction`, the selected card and charging the move. (`rules/Actions.ts`. Every action ends in the controller's `completeAction`, which discards the card, clears the selection and the pending action, and charges the move. The `revealHand` effect records the Dorm's `cardInstanceId`, so the Dorm that was played is the one discarded. `stealRandomCard` takes an optional `random` for tests.)
- [x] **Visibility rule in the controller:** the logic of `isCardVisibleToPlayer` (own cards, `facedUp`, Messy Dorm reveals) should be a model rule that takes the viewer as an argument. `getViewer()` stays in the controller, because who sits at the screen is not a game rule. (`rules/Visibility.ts`: `isCardVisible(game, card, owner, viewer)`. The controller's `isCardVisibleToPlayer` passes `getViewer()`.)
- [x] **Card state can still be changed from outside the model:** the controller writes `card.facedUp` directly in `drawCard` (the opening deal and the Power of Tea reveal now live in the model, but still write the field directly), and views get `Card` objects with writable fields. Route those writes through model methods (like the existing `resetFieldState()`), and give the views a read-only `CardView` in `model/game/views.ts`. (`Card.reveal()`/`hide()` are the only way to change `facedUp`, and `addToHand` hides, so the draw and deal writes are gone. Views get `CardView`.)
- [x] **Signatures, round 2:** `drawCard(player)`, `clickHandCard(player, card)` and `selectHandCard(player, card)` take a player even though only the current player can act. That breaks the rule under "Controller flow" (methods that only act for the current player take no player argument). Drop the argument, or document why they're exceptions. (Dropped, along with `canDrawCard(player)`. Because `drawCard()` now always acts for the current player and the AI calls it, humans use the new `clickDeck()`/`canClickDeck()`, which carry the AI-turn guard. `canPlayHandCard(player, card)` keeps its player: it is a query about any player.)
- [x] **`Player.playToField` can't report failure:** it returns `null` both for "placed, no match" and "couldn't place", so `playCreatureCard`/`playUpgradeCard` always report success and rely on the validator having run first. Return a result that tells the two apart, and only look for a matching twin when the card goes in col 0 or 1. (It returns a `PlaceResult`: `{ placed: false }` changes nothing, not even a new row, and `{ placed: true, match }` carries the matched pair.)

### 3. Missing rules
- [ ] **Win condition:** the opponent has no creatures on the field or in their hand. A `win` result is never set yet, and the end screen only shows a loss.
- [ ] **Matched Chicken:** while the pair is face up, the opponent's newly played creatures and upgrades must go down face up. Only the one-time reveal exists.
- [ ] **Power of Tea:** revealing one card of a matched pair should flip both, and revealing a matched Chicken should trigger its ability.
- [ ] **Matching:** a pair should stay face down until the player chooses to activate it, which costs no move. Right now it reveals and activates as soon as it is made. Activation is automatic only if the bottom creature was already face up.
- [ ] **Matched Cat:** only the same Cat should be allowed to keep attacking. Right now any matched Cat can.
- [x] **First turn:** only a creature may be played.
- [ ] **Setup:** deal 3 random creatures and then 2 more cards. Right now the controller redraws whole 5-card hands until one has at least 3 creatures.
- [x] **Draw first:** the player must draw before making any move.

### 4. Features not built yet
- [ ] **Hot-seat (human vs. human) mode.** This is a planned feature, not a bug. The model and controller already support it: `useGameController({ player2IsAI: false })` creates a game with two humans, `getViewer()` is then the current player, and tests cover that path. The UI just has no way to start one: `App.tsx` renders the game views without options, and `useGameController` defaults to `player2IsAI = true`. To build it:
  - Add a landing-page choice and pass it through the game views to `useGameController`.
  - Add a hand-off screen between turns, so the next player doesn't see the previous player's hand.
