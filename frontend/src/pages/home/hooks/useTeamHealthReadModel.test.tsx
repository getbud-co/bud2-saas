/**
 * Tests for useTeamHealthReadModel
 *
 * This hook computes team health metrics: a summary of good/attention/critical
 * counts, per-member health status (based on mission progress and check-in
 * recency), and team filter options.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AllProviders } from "../../../../tests/setup/test-utils";
import { useTeamHealthReadModel } from "./useTeamHealthReadModel";

function wrapper({ children }: { children: ReactNode }) {
  return <AllProviders>{children}</AllProviders>;
}

describe("useTeamHealthReadModel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Return structure
  // ═══════════════════════════════════════════════════════════════════════════

  it("returns an object with summary, members, and teamOptions", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });
    expect(result.current).toHaveProperty("summary");
    expect(result.current).toHaveProperty("members");
    expect(result.current).toHaveProperty("teamOptions");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════

  it("summary contains good, attention, and critical counts", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });
    const { summary } = result.current;

    expect(typeof summary.good).toBe("number");
    expect(typeof summary.attention).toBe("number");
    expect(typeof summary.critical).toBe("number");
  });

  it("summary counts are non-negative", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });
    const { summary } = result.current;

    expect(summary.good).toBeGreaterThanOrEqual(0);
    expect(summary.attention).toBeGreaterThanOrEqual(0);
    expect(summary.critical).toBeGreaterThanOrEqual(0);
  });

  it("summary counts sum to total members count", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });
    const { summary, members } = result.current;

    expect(summary.good + summary.attention + summary.critical).toBe(members.length);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Members
  // ═══════════════════════════════════════════════════════════════════════════

  it("members is an array", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });
    expect(Array.isArray(result.current.members)).toBe(true);
  });

  it("each member has required properties with correct types", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });

    for (const member of result.current.members) {
      expect(typeof member.id).toBe("string");
      expect(typeof member.name).toBe("string");
      expect(typeof member.initials).toBe("string");
      expect(typeof member.missions).toBe("number");
      expect(typeof member.missionsExpected).toBe("number");
      expect(["good", "attention", "critical"]).toContain(member.status);
      expect(typeof member.lastCheckinDays).toBe("number");
      expect(typeof member.lastCheckinLabel).toBe("string");
    }
  });

  it("members are sorted by status: critical first, then attention, then good", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });
    const statusOrder = { critical: 0, attention: 1, good: 2 };
    const statuses = result.current.members.map((m) => statusOrder[m.status]);

    for (let i = 1; i < statuses.length; i++) {
      expect(statuses[i - 1]).toBeLessThanOrEqual(statuses[i]!);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Team options
  // ═══════════════════════════════════════════════════════════════════════════

  it("teamOptions starts with 'Todos os times'", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });
    expect(result.current.teamOptions.length).toBeGreaterThanOrEqual(1);
    expect(result.current.teamOptions[0]).toEqual({
      id: "all",
      label: "Todos os times",
    });
  });

  it("each team option has id and label", () => {
    const { result } = renderHook(() => useTeamHealthReadModel(), { wrapper });

    for (const option of result.current.teamOptions) {
      expect(typeof option.id).toBe("string");
      expect(typeof option.label).toBe("string");
    }
  });
});
