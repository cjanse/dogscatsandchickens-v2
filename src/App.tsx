import React, { useState } from "react";
import GamePage from "./GamePageV1";

type Page = "main" | "v1" | "game";

export default function App() {
  const [page, setPage] = useState<Page>("main");

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
          <p>Simple landing page for V1.</p>
          <button onClick={() => setPage("main")}>Back</button>
          <button onClick={() => setPage("game")}>Start Game (V1)</button>
        </div>
      )}

      {page === "game" && (
        <div>
          <button onClick={() => setPage("v1")} style={{ marginBottom: 12 }}>
            Back to V1
          </button>
          <GamePage />
        </div>
      )}
    </div>
  );
}