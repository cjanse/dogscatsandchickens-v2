import "@fontsource-variable/nunito";
import "@fontsource-variable/fredoka";
import "./desktop.css";
import { useEffect, useState } from "react";
import { useGameController } from "../../app/useGameController";
import { GameOverScreen } from "../components/GameOverScreen";
import { FieldLane } from "./FieldLane";
import { HandTray } from "./HandTray";
import { createHoverPopoverStore, HoverPopoverContext } from "./hoverPopover";
import { HoverPopoverLayer } from "./HoverPopoverLayer";
import { OpponentHandRow } from "./OpponentHandRow";
import { SideRail } from "./SideRail";

/**
 * The desktop game screen: one table (opponent at the top, you at the bottom) and a side rail on the
 * right. It covers the whole window (position: fixed), so the page itself never scrolls.
 */
export function DesktopGamePage() {
  const controls = useGameController();
  const [popover] = useState(createHoverPopoverStore);

  // The page only re-renders when the game (or the message) changes, never for the popover, which has
  // its own store. So every render closes it: it can't go stale, outlive its tile, or stay open into the
  // opponent's turn (the overlay appears under a still cursor, and no pointerleave may fire).
  useEffect(() => popover.hide());

  if (controls.result.state !== "ongoing") {
    return <GameOverScreen result={controls.result} />;
  }

  return (
    <HoverPopoverContext value={popover}>
      <div className="gp-desktop">
        <div className="gpd-board-area">
          <main className="gpd-board">
            <OpponentHandRow controls={controls} />
            <FieldLane controls={controls} owner={controls.opponent} isOpponent />
            <div className="gpd-centre-line" aria-hidden="true" />
            <FieldLane controls={controls} owner={controls.viewer} isOpponent={false} />
            <HandTray controls={controls} />
            {/* Dims the board and blocks clicks (and hover) while the AI plays */}
            <div className="gpd-turn-overlay" data-active={!controls.isMyTurn} aria-hidden="true" />
          </main>
        </div>
        <SideRail controls={controls} />
        {/* Outside the lanes' overflow, above everything */}
        <HoverPopoverLayer controls={controls} store={popover} />
      </div>
    </HoverPopoverContext>
  );
}
