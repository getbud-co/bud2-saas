/**
 * Tests for useHomeActivities
 *
 * This hook combines activities from multiple sources (missions, surveys,
 * check-ins) into a unified activities list. It exposes a preview (max 4),
 * the full list, and the underlying mission read model.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AllProviders } from "../../../../tests/setup/test-utils";
import { useHomeActivities } from "./useHomeActivities";

function wrapper({ children }: { children: ReactNode }) {
  return <AllProviders>{children}</AllProviders>;
}

describe("useHomeActivities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Return structure
  // ═══════════════════════════════════════════════════════════════════════════

  it("returns an object with activities, allActivities, and readModel", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });
    expect(result.current).toHaveProperty("activities");
    expect(result.current).toHaveProperty("allActivities");
    expect(result.current).toHaveProperty("readModel");
  });

  it("activities is an array", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });
    expect(Array.isArray(result.current.activities)).toBe(true);
  });

  it("allActivities is an array", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });
    expect(Array.isArray(result.current.allActivities)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Preview limit
  // ═══════════════════════════════════════════════════════════════════════════

  it("activities (preview) has at most 4 items", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });
    expect(result.current.activities.length).toBeLessThanOrEqual(4);
  });

  it("allActivities length is >= activities preview length", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });
    expect(result.current.allActivities.length).toBeGreaterThanOrEqual(
      result.current.activities.length,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Activity item shape
  // ═══════════════════════════════════════════════════════════════════════════

  it("each activity item has title, subtitle, category, and route", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });

    for (const activity of result.current.allActivities) {
      expect(typeof activity.title).toBe("string");
      expect(typeof activity.subtitle).toBe("string");
      expect(typeof activity.category).toBe("string");
      expect(typeof activity.route).toBe("string");
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sorting: urgent first
  // ═══════════════════════════════════════════════════════════════════════════

  it("urgent activities appear before non-urgent ones", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });
    const items = result.current.allActivities;

    let seenNonUrgent = false;
    for (const item of items) {
      if (!item.urgent) {
        seenNonUrgent = true;
      }
      if (item.urgent && seenNonUrgent) {
        // An urgent item after a non-urgent one violates the sort
        expect(true).toBe(false);
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ReadModel passthrough
  // ═══════════════════════════════════════════════════════════════════════════

  it("readModel contains annual, quarter, and activities from mission read model", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });
    const { readModel } = result.current;

    expect(readModel).toHaveProperty("annual");
    expect(readModel).toHaveProperty("quarter");
    expect(readModel).toHaveProperty("activities");
  });

  it("readModel.annual has value and expected properties", () => {
    const { result } = renderHook(() => useHomeActivities(), { wrapper });
    expect(typeof result.current.readModel.annual.value).toBe("number");
    expect(typeof result.current.readModel.annual.expected).toBe("number");
  });
});
