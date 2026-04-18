/**
 * Tests for missions.ts utility functions
 *
 * Pure helper functions for KR status, goal labels, owner formatting, etc.
 */

import { describe, it, expect } from "vitest";
import {
  numVal,
  getKRStatusLabel,
  getKRStatusBadge,
  formatPeriodRange,
  getOwnerName,
  getOwnerInitials,
  getGoalLabel,
} from "./missions";
import type { KeyResult } from "@/types";

// ─── Test Helpers ───

function makeKR(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: "kr-1",
    missionId: "m-1",
    title: "Test KR",
    goalType: "reach",
    unit: "number",
    unitLabel: null,
    currentValue: "50",
    targetValue: "100",
    startValue: "0",
    lowThreshold: null,
    highThreshold: null,
    weight: 1,
    status: "on_track",
    confidence: 0.8,
    measurementMode: "manual",
    ownerId: "user-1",
    owner: null,
    checkIns: [],
    tasks: [],
    contributions: [],
    externalContributions: [],
    ...overrides,
  } as KeyResult;
}

// ─── Tests ───

describe("numVal", () => {
  it("parses valid number string", () => {
    expect(numVal("42")).toBe(42);
  });

  it("parses decimal string", () => {
    expect(numVal("3.14")).toBeCloseTo(3.14);
  });

  it("returns 0 for null", () => {
    expect(numVal(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(numVal(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(numVal("")).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(numVal("abc")).toBe(0);
  });
});

describe("getKRStatusLabel", () => {
  it("returns 'No ritmo' for on_track", () => {
    expect(getKRStatusLabel("on_track")).toBe("No ritmo");
  });

  it("returns 'Atenção' for attention", () => {
    expect(getKRStatusLabel("attention")).toBe("Atenção");
  });

  it("returns 'Atrasado' for off_track", () => {
    expect(getKRStatusLabel("off_track")).toBe("Atrasado");
  });

  it("returns 'Concluído' for completed", () => {
    expect(getKRStatusLabel("completed")).toBe("Concluído");
  });
});

describe("getKRStatusBadge", () => {
  it("returns 'success' for on_track", () => {
    expect(getKRStatusBadge("on_track")).toBe("success");
  });

  it("returns 'warning' for attention", () => {
    expect(getKRStatusBadge("attention")).toBe("warning");
  });

  it("returns 'error' for off_track", () => {
    expect(getKRStatusBadge("off_track")).toBe("error");
  });

  it("returns 'success' for completed", () => {
    expect(getKRStatusBadge("completed")).toBe("success");
  });
});

describe("formatPeriodRange", () => {
  it("formats date range", () => {
    expect(formatPeriodRange("2026-01-01", "2026-03-31")).toBe("01/01/2026 à 31/03/2026");
  });

  it("returns empty string when start is null", () => {
    expect(formatPeriodRange(null, "2026-03-31")).toBe("");
  });

  it("returns empty string when end is null", () => {
    expect(formatPeriodRange("2026-01-01", null)).toBe("");
  });
});

describe("getOwnerName", () => {
  it("returns full name", () => {
    expect(getOwnerName({ firstName: "Maria", lastName: "Silva" })).toBe("Maria Silva");
  });

  it("returns empty string when undefined", () => {
    expect(getOwnerName(undefined)).toBe("");
  });
});

describe("getOwnerInitials", () => {
  it("returns initials from owner.initials", () => {
    expect(getOwnerInitials({ firstName: "Maria", lastName: "Silva", initials: "MS" })).toBe("MS");
  });

  it("generates initials from names when initials is null", () => {
    expect(getOwnerInitials({ firstName: "Maria", lastName: "Silva", initials: null })).toBe("MS");
  });

  it("returns '??' when undefined", () => {
    expect(getOwnerInitials(undefined)).toBe("??");
  });
});

describe("getGoalLabel", () => {
  it("returns reach label", () => {
    const label = getGoalLabel(makeKR({ goalType: "reach", targetValue: "100" }));
    expect(label).toContain("Atingir");
    expect(label).toContain("100");
  });

  it("returns between label", () => {
    const label = getGoalLabel(makeKR({ goalType: "between", lowThreshold: "10", highThreshold: "20" }));
    expect(label).toContain("Manter entre");
    expect(label).toContain("10");
    expect(label).toContain("20");
  });

  it("returns reduce label", () => {
    const label = getGoalLabel(makeKR({ goalType: "reduce", targetValue: "5" }));
    expect(label).toContain("Reduzir");
    expect(label).toContain("5");
  });

  it("returns survey label", () => {
    const label = getGoalLabel(makeKR({ goalType: "survey" }));
    expect(label).toContain("pesquisa");
  });
});
