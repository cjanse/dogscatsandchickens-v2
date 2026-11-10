import { describe, it, expect } from "vitest";
import { fieldRowsWithPlaceholders } from "../../app/fieldRows";
import { makeCreature } from "../controller/helpers";

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
