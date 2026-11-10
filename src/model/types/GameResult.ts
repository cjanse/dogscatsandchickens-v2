export type GameResult =
  | { state: "ongoing" }
  | { state: "win"; winnerId: number }
  | { state: "loss"; loserId: number }
  | { state: "tie" };
