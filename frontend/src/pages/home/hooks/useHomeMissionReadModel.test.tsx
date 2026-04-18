/**
 * Tests for useHomeMissionReadModel
 *
 * This hook produces annual and quarterly mission cycle summaries
 * (progress, expected, key results) and a list of urgent activity items
 * for missions that are off-track or need attention.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AllProviders } from "../../../../tests/setup/test-utils";
import { useHomeMissionReadModel } from "./useHomeMissionReadModel";

function wrapper({ children }: { children: ReactNode }) {
  return <AllProviders>{children}</AllProviders>;
}

describe("useHomeMissionReadModel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Return structure
  // ═══════════════════════════════════════════════════════════════════════════

  it("returns an object with annual, quarter, and activities", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    expect(result.current).toHaveProperty("annual");
    expect(result.current).toHaveProperty("quarter");
    expect(result.current).toHaveProperty("activities");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Annual cycle info
  // ═══════════════════════════════════════════════════════════════════════════

  it("annual has correct HomeCycleInfo shape", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    const { annual } = result.current;

    expect(typeof annual.id).toBe("string");
    expect(typeof annual.label).toBe("string");
    expect(typeof annual.value).toBe("number");
    expect(typeof annual.expected).toBe("number");
    expect(typeof annual.target).toBe("number");
    expect(Array.isArray(annual.keyResults)).toBe(true);
  });

  it("annual value is between 0 and 100", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    expect(result.current.annual.value).toBeGreaterThanOrEqual(0);
    expect(result.current.annual.value).toBeLessThanOrEqual(100);
  });

  it("annual target is 100", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    expect(result.current.annual.target).toBe(100);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Quarterly cycle info
  // ═══════════════════════════════════════════════════════════════════════════

  it("quarter has correct HomeCycleInfo shape", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    const { quarter } = result.current;

    expect(typeof quarter.id).toBe("string");
    expect(typeof quarter.label).toBe("string");
    expect(typeof quarter.value).toBe("number");
    expect(typeof quarter.expected).toBe("number");
    expect(typeof quarter.target).toBe("number");
    expect(Array.isArray(quarter.keyResults)).toBe(true);
  });

  it("quarter target is 100", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    expect(result.current.quarter.target).toBe(100);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Key Results
  // ═══════════════════════════════════════════════════════════════════════════

  it("key results have correct HomeMissionKR shape", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    const allKrs = [
      ...result.current.annual.keyResults,
      ...result.current.quarter.keyResults,
    ];

    for (const kr of allKrs) {
      expect(typeof kr.id).toBe("string");
      expect(typeof kr.label).toBe("string");
      expect(typeof kr.value).toBe("number");
      expect(typeof kr.expected).toBe("number");
      expect(typeof kr.target).toBe("number");
      expect(typeof kr.owner).toBe("string");
      expect(["on-track", "attention", "off-track"]).toContain(kr.status);
    }
  });

  it("each cycle has at most 5 key results", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    expect(result.current.annual.keyResults.length).toBeLessThanOrEqual(5);
    expect(result.current.quarter.keyResults.length).toBeLessThanOrEqual(5);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Activities
  // ═══════════════════════════════════════════════════════════════════════════

  it("activities is an array of HomeActivityItem", () => {
    const { result } = renderHook(() => useHomeMissionReadModel(), { wrapper });
    expect(Array.isArray(result.current.activities)).toBe(true);

    for (const activity of result.current.activities) {
      expect(typeof activity.title).toBe("string");
      expect(typeof activity.subtitle).toBe("string");
      expect(typeof activity.category).toBe("string");
      expect(typeof activity.route).toBe("string");
    }
  });
});
