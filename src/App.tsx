import { useState } from "react";
import "./App.css";
import GamePageV1 from "./GamePageV1";
import GamePageV1Mobile from "./GamePageV1Mobile";
import GamePageV1Diagnostics from "./GamePageV1Diagnostics";

type Page = "main" | "v1" | "game";
type V1GameMode = "regular" | "diagnostics" | "mobile" | null;

export default function App() {
  const [page, setPage] = useState<Page>("main");
  const [v1GameMode, setV1GameMode] = useState<V1GameMode>(null);

  return (
    <div style={{ padding: 24 }}>
      {page === "main" && (
        <div>
          <h1>Welcome</h1>
          <p>This is the main page.</p>
          <button onClick={() => setPage("v1")}>Go to V1</button>
        </div>
      )}

      {page === "v1" && (
        <div>
          <h1>V1 Landing</h1>
          <p>Choose a game mode:</p>
          <button onClick={() => setPage("main")}>Back</button>
          <button onClick={() => { setV1GameMode("regular"); setPage("game"); }}>Start Game (Desktop)</button>
          <button onClick={() => { setV1GameMode("mobile"); setPage("game"); }}>Start Game (Mobile)</button>
          <button onClick={() => { setV1GameMode("diagnostics"); setPage("game"); }}>Start Diagnostics</button>
        </div>
      )}

      {page === "game" && (
        <div>
          <button onClick={() => setPage("v1")} style={{ marginBottom: 12 }}>
            Back to V1
          </button>
          {v1GameMode === "regular" && <GamePageV1 />}
          {v1GameMode === "mobile" && <GamePageV1Mobile />}
          {v1GameMode === "diagnostics" && <GamePageV1Diagnostics />}
        </div>
      )}
    </div>
  );
}