import type { GameControls } from "../../app/useGameController";
import type { PlayerView } from "../../model/game/views";
import { abilityText } from "../../app/abilityText";

/**
 * The orange "⚡ Activate" pill on a face-down matched pair, centred on the front card. Flips the pair face
 * up and turns its ability on, at no move. The caller shows it when `queries.canClickActivate(owner, row)`.
 * Only ⚡ shows on a small tile (container query in desktop.css); the tooltip still names the ability.
 */
export function ActivatePill({ controls, owner, row }: {
  controls: GameControls;
  owner: PlayerView;
  row: number;
}) {
  const abilityType = controls.queries.getPairAbility(owner, row);
  const ability = abilityType ? abilityText(abilityType) : null;
  // The wording about the button itself is view copy; the ability's name and description come from abilities.json
  const tooltip = ability
    ? `Activate ${ability.name} (free, no move): ${ability.description} The pair flips face up.`
    : "Activate this pair's ability (free, no move). The pair flips face up.";

  return (
    <button
      type="button"
      className="gpd-activate-pill"
      title={tooltip}
      aria-label={tooltip}
      onClick={e => {
        // Keep the click away from anything underneath that could start an attack
        e.stopPropagation();
        controls.activatePair(owner, row);
      }}
    >
      <svg className="gpd-activate-icon" viewBox="0 0 9 12" aria-hidden="true" focusable="false">
        <polygon points="5.5,0 0,7 4,7 3,12 9,4.5 5,4.5" fill="currentColor" />
      </svg>
      <span className="gpd-activate-label" aria-hidden="true">Activate</span>
    </button>
  );
}
