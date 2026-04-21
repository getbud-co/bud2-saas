/**
 * Tests for missions.ts utility functions
 *
 * Pure helper functions for KR status, goal labels, owner formatting, etc.
 */

import { describe, it, expect } from "vitest";
import {
  numVal,
  formatPeriodRange,
  getOwnerName,
  getOwnerInitials,
  getGoalLabel,
  getIndicatorIcon,
  formatCheckinDate,
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

describe("getIndicatorIcon", () => {
  it("retorna ArrowsInLineVertical para goalType 'between'", () => {
    const Icon = getIndicatorIcon(makeKR({ goalType: "between" }));
    expect(Icon.displayName ?? Icon.name).toMatch(/arrowsinlinevertical/i);
  });

  it("retorna ArrowsInLineVertical para goalType 'above'", () => {
    const Icon = getIndicatorIcon(makeKR({ goalType: "above" }));
    expect(Icon.displayName ?? Icon.name).toMatch(/arrowsinlinevertical/i);
  });

  it("retorna ArrowsInLineVertical para goalType 'below'", () => {
    const Icon = getIndicatorIcon(makeKR({ goalType: "below" }));
    expect(Icon.displayName ?? Icon.name).toMatch(/arrowsinlinevertical/i);
  });

  it("retorna PlugsConnected para measurementMode 'external'", () => {
    const Icon = getIndicatorIcon(makeKR({ goalType: "reach", measurementMode: "external" }));
    expect(Icon.displayName ?? Icon.name).toMatch(/plugsconnected/i);
  });

  it("retorna Target para measurementMode 'mission'", () => {
    const Icon = getIndicatorIcon(makeKR({ goalType: "reach", measurementMode: "mission" }));
    expect(Icon.displayName ?? Icon.name).toMatch(/target/i);
  });

  it("faz fallback para getGoalTypeIcon para outros casos", () => {
    const Icon = getIndicatorIcon(makeKR({ goalType: "reach", measurementMode: "manual" }));
    expect(Icon.displayName ?? Icon.name).toMatch(/crosshair/i);
  });
});

describe("formatCheckinDate", () => {
  it("formata data ISO para DD/MM/YYYY", () => {
    expect(formatCheckinDate("2026-03-15T10:30:00Z")).toBe("15/03/2026");
  });

  it("faz padding de dia e mês com um dígito", () => {
    // Usa meio-dia UTC para evitar rollover de timezone
    expect(formatCheckinDate("2026-09-05T12:00:00Z")).toMatch(/05\/09\/2026/);
  });
});
