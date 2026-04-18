/**
 * Tests for ActivityDataContext
 *
 * This context tracks user activities, persisting them to localStorage.
 * It provides logActivity for recording and getActivitiesForUserId for querying.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActivityDataProvider, useActivityData } from "./ActivityDataContext";

// ─── Test Helpers ───

function wrapper({ children }: { children: ReactNode }) {
  return <ActivityDataProvider>{children}</ActivityDataProvider>;
}

// ─── Tests ───

describe("ActivityDataContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("context setup", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useActivityData());
      }).toThrow("useActivityData deve ser usado dentro de ActivityDataProvider");
    });

    it("provides context when used with provider", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });
      expect(result.current).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("has activities array", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });
      expect(Array.isArray(result.current.activities)).toBe(true);
    });

    it("has logActivity function", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });
      expect(typeof result.current.logActivity).toBe("function");
    });

    it("has getActivitiesForUserId function", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });
      expect(typeof result.current.getActivitiesForUserId).toBe("function");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // logActivity
  // ═══════════════════════════════════════════════════════════════════════════

  describe("logActivity", () => {
    it("adds a new activity", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });

      const initialCount = result.current.activities.length;

      act(() => {
        result.current.logActivity({
          userId: "user-1",
          type: "login",
          entityId: null,
          entityType: null,
          metadata: null,
        });
      });

      expect(result.current.activities.length).toBe(initialCount + 1);
    });

    it("auto-generates id and createdAt", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });

      act(() => {
        result.current.logActivity({
          userId: "user-1",
          type: "checkin_create",
          entityId: "checkin-1",
          entityType: "checkin",
          metadata: null,
        });
      });

      const last = result.current.activities[result.current.activities.length - 1];
      expect(last?.id).toBeDefined();
      expect(last?.createdAt).toBeDefined();
      expect(new Date(last!.createdAt).getTime()).toBeGreaterThan(0);
    });

    it("persists activity to localStorage", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });

      act(() => {
        result.current.logActivity({
          userId: "user-1",
          type: "mission_view",
          entityId: "mission-1",
          entityType: "mission",
          metadata: { source: "dashboard" },
        });
      });

      const stored = localStorage.getItem("bud_activity_store_v1");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.activities.length).toBeGreaterThan(0);
    });

    it("stores activity with correct fields", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });

      act(() => {
        result.current.logActivity({
          userId: "user-42",
          type: "survey_complete",
          entityId: "survey-5",
          entityType: "survey",
          metadata: { score: 85 },
        });
      });

      // New activities are prepended (newest first)
      const first = result.current.activities[0];
      expect(first?.userId).toBe("user-42");
      expect(first?.type).toBe("survey_complete");
      expect(first?.entityId).toBe("survey-5");
      expect(first?.entityType).toBe("survey");
      expect(first?.metadata).toEqual({ score: 85 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getActivitiesForUserId
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getActivitiesForUserId", () => {
    it("returns activities for a specific user", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });

      act(() => {
        result.current.logActivity({
          userId: "user-A",
          type: "login",
          entityId: null,
          entityType: null,
          metadata: null,
        });
        result.current.logActivity({
          userId: "user-B",
          type: "login",
          entityId: null,
          entityType: null,
          metadata: null,
        });
      });

      const userAActivities = result.current.getActivitiesForUserId("user-A");
      expect(userAActivities.every((a) => a.userId === "user-A")).toBe(true);
    });

    it("returns empty array for non-existent user", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });
      const activities = result.current.getActivitiesForUserId("non-existent");
      expect(activities).toEqual([]);
    });

    it("filters by days parameter", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });

      // Log a recent activity
      act(() => {
        result.current.logActivity({
          userId: "user-1",
          type: "login",
          entityId: null,
          entityType: null,
          metadata: null,
        });
      });

      // With 1 day window, the just-logged activity should be included
      const recentActivities = result.current.getActivitiesForUserId("user-1", 1);
      expect(recentActivities.length).toBeGreaterThanOrEqual(1);
    });

    it("defaults to 30 days when days param is omitted", () => {
      const { result } = renderHook(() => useActivityData(), { wrapper });

      act(() => {
        result.current.logActivity({
          userId: "user-1",
          type: "login",
          entityId: null,
          entityType: null,
          metadata: null,
        });
      });

      const activities = result.current.getActivitiesForUserId("user-1");
      expect(activities.length).toBeGreaterThanOrEqual(1);
    });
  });
});
