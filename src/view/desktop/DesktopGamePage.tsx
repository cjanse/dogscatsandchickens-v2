import "@fontsource-variable/nunito";
import "@fontsource-variable/fredoka";
import "./desktop.css";
import { useGameController } from "../../app/useGameController";
import { GameOverScreen } from "../components/GameOverScreen";
import { FieldLane } from "./FieldLane";
import { HandTray } from "./HandTray";
import { OpponentHandRow } from "./OpponentHandRow";
import { SideRail } from "./SideRail";

/**
 * The desktop game screen: one table (opponent at the top, you at the bottom) and a side rail on the
 * right. It covers the whole window (position: fixed), so the page itself never scrolls.
 */
export function DesktopGamePage() {
  const controls = useGameController();

  if (controls.result.state !== "ongoing") {
    return <GameOverScreen result={controls.result} />;
  }

  return (
    <div className="gp-desktop">
      <div className="gpd-board-area">
        <main className="gpd-board">
          <OpponentHandRow controls={controls} />
          <FieldLane controls={controls} owner={controls.opponent} isOpponent />
          <div className="gpd-centre-line" aria-hidden="true" />
          <FieldLane controls={controls} owner={controls.viewer} isOpponent={false} />
          <HandTray controls={controls} />
          {/* Dims the board and blocks clicks while the AI plays */}
          <div className="gpd-turn-overlay" data-active={!controls.isMyTurn} aria-hidden="true" />
        </main>
      </div>
      <SideRail controls={controls} />
      {/* Empty for now: the hover popover (a later phase) renders here, outside the lanes' overflow */}
      <div className="gpd-popover-layer" aria-hidden="true" />
    </div>
  );
}
