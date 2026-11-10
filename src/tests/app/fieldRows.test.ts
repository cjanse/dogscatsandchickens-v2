import { describe, it, expect } from "vitest";
import { columnsInUse, fieldRowsWithPlaceholders, visualCells } from "../../app/fieldRows";
import { makeCreature, makeUpgrade } from "../controller/helpers";

describe("fieldRowsWithPlaceholders", () => {
  it("shows a single placeholder for an empty field", () => {
    const rows = fieldRowsWithPlaceholders([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].modelRow).toBe(0);
    expect(rows[0].isPlaceholder).toBe(true);
    expect(rows[0].cells).toEqual([null, null, null, null]);
  });

  it("adds a placeholder above (-1) and below (field.length) the real rows", () => {
    const a = makeCreature("a");
    const b = makeCreature("b");
    const field = [
      [a, null, null, null],
      [b, null, null, null],
    ];

    const rows = fieldRowsWithPlaceholders(field);

    expect(rows.map(r => r.modelRow)).toEqual([-1, 0, 1, 2]);
    expect(rows.map(r => r.isPlaceholder)).toEqual([true, false, false, true]);
    expect(rows[1].cells).toBe(field[0]);
    expect(rows[2].cells).toBe(field[1]);
  });
});

describe("columnsInUse", () => {
  it("needs 1 column for an empty row", () => {
    expect(columnsInUse([null, null, null, null])).toBe(1);
  });

  it("needs 3 columns for a creature with no upgrade", () => {
    expect(columnsInUse([makeCreature("a"), null, null, null])).toBe(3);
  });

  it("needs all 4 columns once the creature has an upgrade", () => {
    expect(columnsInUse([makeCreature("a"), null, makeUpgrade(), null])).toBe(4);
  });
});

describe("visualCells", () => {
  const a = makeCreature("a");
  const up = makeUpgrade();
  const row = [a, null, up, null];

  it("keeps model order for your own field", () => {
    expect(visualCells(row, false)).toEqual([
      { cell: a, modelCol: 0 },
      { cell: null, modelCol: 1 },
      { cell: up, modelCol: 2 },
      { cell: null, modelCol: 3 },
    ]);
  });

  it("mirrors the opponent's field", () => {
    expect(visualCells(row, true).map(c => c.modelCol)).toEqual([3, 2, 1, 0]);
  });

  it("shows only the first colsToShow model columns, mirrored for the opponent", () => {
    expect(visualCells(row, false, 3).map(c => c.modelCol)).toEqual([0, 1, 2]);
    expect(visualCells(row, true, 3).map(c => c.modelCol)).toEqual([2, 1, 0]);
  });
});
