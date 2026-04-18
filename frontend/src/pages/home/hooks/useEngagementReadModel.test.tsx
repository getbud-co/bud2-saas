/**
 * Tests for useEngagementReadModel
 *
 * This hook computes engagement metrics (overall, missions updated,
 * survey participation), per-member engagement, and weekly chart data
 * from PeopleData, MissionsData, and SurveysData contexts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AllProviders } from "../../../../tests/setup/test-utils";
import { useEngagementReadModel } from "./useEngagementReadModel";

function wrapper({ children }: { children: ReactNode }) {
  return <AllProviders>{children}</AllProviders>;
}

describe("useEngagementReadModel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Return structure
  // ═══════════════════════════════════════════════════════════════════════════

  it("returns an object with metrics, teamMembers, teamOptions, and weeklyData", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });
    expect(result.current).toHaveProperty("metrics");
    expect(result.current).toHaveProperty("teamMembers");
    expect(result.current).toHaveProperty("teamOptions");
    expect(result.current).toHaveProperty("weeklyData");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Metrics
  // ═══════════════════════════════════════════════════════════════════════════

  it("metrics contains overall, missionsUpdated, surveyParticipation, trend, and trendDirection", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });
    const { metrics } = result.current;

    expect(typeof metrics.overall).toBe("number");
    expect(typeof metrics.missionsUpdated).toBe("number");
    expect(typeof metrics.surveyParticipation).toBe("number");
    expect(typeof metrics.trend).toBe("number");
    expect(["up", "down"]).toContain(metrics.trendDirection);
  });

  it("overall metric is between 0 and 100", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });
    expect(result.current.metrics.overall).toBeGreaterThanOrEqual(0);
    expect(result.current.metrics.overall).toBeLessThanOrEqual(100);
  });

  it("missionsUpdated metric is between 0 and 100", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });
    expect(result.current.metrics.missionsUpdated).toBeGreaterThanOrEqual(0);
    expect(result.current.metrics.missionsUpdated).toBeLessThanOrEqual(100);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Team members
  // ═══════════════════════════════════════════════════════════════════════════

  it("teamMembers is an array", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });
    expect(Array.isArray(result.current.teamMembers)).toBe(true);
  });

  it("each team member has required properties", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });

    for (const member of result.current.teamMembers) {
      expect(typeof member.id).toBe("string");
      expect(typeof member.name).toBe("string");
      expect(typeof member.initials).toBe("string");
      expect(typeof member.role).toBe("string");
      expect(typeof member.value).toBe("number");
      expect(typeof member.trend).toBe("number");
      expect(["up", "down"]).toContain(member.trendDirection);
    }
  });

  it("teamMembers are sorted by value descending", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });
    const values = result.current.teamMembers.map((m) => m.value);

    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1]).toBeGreaterThanOrEqual(values[i]!);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Team options
  // ═══════════════════════════════════════════════════════════════════════════

  it("teamOptions starts with 'Todos os times'", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });
    expect(result.current.teamOptions.length).toBeGreaterThanOrEqual(1);
    expect(result.current.teamOptions[0]).toEqual({
      id: "all",
      label: "Todos os times",
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Weekly data
  // ═══════════════════════════════════════════════════════════════════════════

  it("weeklyData is an array of objects with week, engajamento, missoes, pulso", () => {
    const { result } = renderHook(() => useEngagementReadModel(), { wrapper });
    expect(Array.isArray(result.current.weeklyData)).toBe(true);

    for (const entry of result.current.weeklyData) {
      expect(typeof entry.week).toBe("string");
      expect(typeof entry.engajamento).toBe("number");
      expect(typeof entry.missoes).toBe("number");
      expect(typeof entry.pulso).toBe("number");
    }
  });
});
