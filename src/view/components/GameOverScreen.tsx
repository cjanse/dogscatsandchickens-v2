import type { GameResult } from "../../model/types/GameResult";

/** The end screen. Render it instead of the board once `result.state` isn't "ongoing". */
export function GameOverScreen({ result }: { result: GameResult }) {
  return (
    <div>
      {result.state === "tie" && <h1>It's a Tie!</h1>}
      {result.state === "loss" && <h1>Player {result.loserId} Loses</h1>}
      {result.state === "win" && <h1>Player {result.winnerId} Wins</h1>}
    </div>
  );
}
