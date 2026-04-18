/**
 * Tests for useBriefingReadModel
 *
 * This hook produces a list of BriefingItem objects representing
 * actionable alerts: at-risk missions, low survey response, team
 * performance highlights, team size info, or a default positive message.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AllProviders } from "../../../../tests/setup/test-utils";
import { useBriefingReadModel } from "./useBriefingReadModel";

function wrapper({ children }: { children: ReactNode }) {
  return <AllProviders>{children}</AllProviders>;
}

describe("useBriefingReadModel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Return structure
  // ═══════════════════════════════════════════════════════════════════════════

  it("returns an array of BriefingItem objects", () => {
    const { result } = renderHook(() => useBriefingReadModel(), { wrapper });
    expect(Array.isArray(result.current)).toBe(true);
  });

  it("returns at least one item (default positive message as fallback)", () => {
    const { result } = renderHook(() => useBriefingReadModel(), { wrapper });
    expect(result.current.length).toBeGreaterThanOrEqual(1);
  });

  it("returns at most 4 items", () => {
    const { result } = renderHook(() => useBriefingReadModel(), { wrapper });
    expect(result.current.length).toBeLessThanOrEqual(4);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Item structure
  // ═══════════════════════════════════════════════════════════════════════════

  it("each item has id, icon, priority, and text", () => {
    const { result } = renderHook(() => useBriefingReadModel(), { wrapper });

    for (const item of result.current) {
      expect(typeof item.id).toBe("string");
      expect(item.icon).toBeDefined();
      expect(["high", "normal", "positive"]).toContain(item.priority);
      expect(typeof item.text).toBe("string");
      expect(item.text.length).toBeGreaterThan(0);
    }
  });

  it("items with action have label and optionally href", () => {
    const { result } = renderHook(() => useBriefingReadModel(), { wrapper });

    for (const item of result.current) {
      if (item.action) {
        expect(typeof item.action.label).toBe("string");
        expect(item.action.label.length).toBeGreaterThan(0);
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sorting
  // ═══════════════════════════════════════════════════════════════════════════

  it("items are sorted by priority: high first, then normal, then positive", () => {
    const { result } = renderHook(() => useBriefingReadModel(), { wrapper });
    const priorityOrder = { high: 0, normal: 1, positive: 2 };
    const priorities = result.current.map((item) => priorityOrder[item.priority]);

    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i - 1]).toBeLessThanOrEqual(priorities[i]!);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IDs are unique
  // ═══════════════════════════════════════════════════════════════════════════

  it("all items have unique ids", () => {
    const { result } = renderHook(() => useBriefingReadModel(), { wrapper });
    const ids = result.current.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Stability
  // ═══════════════════════════════════════════════════════════════════════════

  it("returns the same reference on consecutive renders (memoized)", () => {
    const { result, rerender } = renderHook(() => useBriefingReadModel(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
