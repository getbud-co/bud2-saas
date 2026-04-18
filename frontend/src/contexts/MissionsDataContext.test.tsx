/**
 * Tests for MissionsDataContext
 *
 * This context provides React state management for missions (OKRs) data including
 * objectives, key results, and check-ins. It includes an outbox pattern for
 * optimistic updates and sync with backend.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActivityDataProvider } from "./ActivityDataContext";
import { ConfigDataProvider } from "./ConfigDataContext";
import { MissionsDataProvider, useMissionsData } from "./MissionsDataContext";

// ─── Test Helpers ───

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ConfigDataProvider>
      <ActivityDataProvider>
        <MissionsDataProvider>{children}</MissionsDataProvider>
      </ActivityDataProvider>
    </ConfigDataProvider>
  );
}

// ─── Tests ───

describe("MissionsDataContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("context setup", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useMissionsData());
      }).toThrow("useMissionsData must be used within MissionsDataProvider");
    });

    it("provides context when used with provider", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });
      expect(result.current).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("has missions array", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });
      expect(Array.isArray(result.current.missions)).toBe(true);
      expect(result.current.missions.length).toBeGreaterThan(0);
    });

    it("has checkInHistory object", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });
      expect(typeof result.current.checkInHistory).toBe("object");
    });

    it("has updatedAt timestamp", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });
      expect(result.current.updatedAt).toBeDefined();
      expect(new Date(result.current.updatedAt).getTime()).toBeGreaterThan(0);
    });

    it("has required functions", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });
      expect(typeof result.current.setMissions).toBe("function");
      expect(typeof result.current.getCheckInsByKeyResult).toBe("function");
      expect(typeof result.current.getCheckInSyncMeta).toBe("function");
      expect(typeof result.current.createCheckIn).toBe("function");
      expect(typeof result.current.updateCheckIn).toBe("function");
      expect(typeof result.current.deleteCheckIn).toBe("function");
      expect(typeof result.current.retryCheckInSync).toBe("function");
      expect(typeof result.current.resetToSeed).toBe("function");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Missions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("missions", () => {
    it("missions have required fields", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions[0];
      if (mission) {
        expect(mission).toHaveProperty("id");
        expect(mission).toHaveProperty("orgId");
        expect(mission).toHaveProperty("title");
        expect(mission).toHaveProperty("ownerId");
        expect(mission).toHaveProperty("status");
      }
    });

    it("setMissions allows updating missions", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const firstMission = result.current.missions[0];
      if (firstMission) {
        const originalTitle = firstMission.title;

        act(() => {
          result.current.setMissions((prev) =>
            prev.map((m) =>
              m.id === firstMission.id ? { ...m, title: "Updated Mission Title" } : m
            )
          );
        });

        const updated = result.current.missions.find((m) => m.id === firstMission.id);
        expect(updated?.title).toBe("Updated Mission Title");
        expect(updated?.title).not.toBe(originalTitle);
      }
    });

    it("setMissions preserves mission count when filtering", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const initialCount = result.current.missions.length;
      expect(initialCount).toBeGreaterThan(0);

      // Filter to keep only active missions
      act(() => {
        result.current.setMissions((prev) => prev.filter((m) => m.status === "active"));
      });

      // Should have filtered some out (or kept all if all are active)
      expect(result.current.missions.length).toBeLessThanOrEqual(initialCount);
      expect(result.current.missions.every((m) => m.status === "active")).toBe(true);
    });

    it("setMissions can remove mission", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const firstMission = result.current.missions[0];
      if (firstMission) {
        const initialCount = result.current.missions.length;

        act(() => {
          result.current.setMissions((prev) => prev.filter((m) => m.id !== firstMission.id));
        });

        expect(result.current.missions.length).toBe(initialCount - 1);
        expect(result.current.missions.find((m) => m.id === firstMission.id)).toBeUndefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Check-Ins
  // ═══════════════════════════════════════════════════════════════════════════

  describe("check-ins", () => {
    it("getCheckInsByKeyResult returns array", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      // Find a key result ID from missions
      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        const checkIns = result.current.getCheckInsByKeyResult(keyResult.id);
        expect(Array.isArray(checkIns)).toBe(true);
      }
    });

    it("getCheckInsByKeyResult returns empty array for unknown key result", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const checkIns = result.current.getCheckInsByKeyResult("unknown-key-result-id");
      expect(checkIns).toEqual([]);
    });

    it("createCheckIn adds new check-in", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      // Find a key result
      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        const initialCheckIns = result.current.getCheckInsByKeyResult(keyResult.id);
        const initialCount = initialCheckIns.length;

        let newCheckIn: ReturnType<typeof result.current.createCheckIn>;
        act(() => {
          newCheckIn = result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "test-author",
            value: "50",
            previousValue: "0",
            confidence: "high",
            note: "Test check-in note",
            mentions: null,
          });
        });

        expect(newCheckIn!).toBeDefined();
        expect(newCheckIn!.id).toBeDefined();
        expect(newCheckIn!.value).toBe("50");
        expect(newCheckIn!.confidence).toBe("high");

        const checkInsAfter = result.current.getCheckInsByKeyResult(keyResult.id);
        expect(checkInsAfter.length).toBe(initialCount + 1);
      }
    });

    it("createCheckIn with author info", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        let newCheckIn: ReturnType<typeof result.current.createCheckIn>;
        act(() => {
          newCheckIn = result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "test-author",
            value: "25",
            previousValue: null,
            confidence: "medium",
            note: null,
            mentions: ["user-1", "user-2"],
            author: {
              id: "test-author",
              firstName: "Test",
              lastName: "User",
              initials: "TU",
            },
          });
        });

        expect(newCheckIn!.author).toBeDefined();
        expect(newCheckIn!.author?.firstName).toBe("Test");
        expect(newCheckIn!.mentions).toEqual(["user-1", "user-2"]);
      }
    });

    it("updateCheckIn modifies existing check-in", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        // Create a check-in first
        let checkInId: string;
        act(() => {
          const checkIn = result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "test-author",
            value: "30",
            previousValue: null,
            confidence: "low",
            note: "Initial note",
            mentions: null,
          });
          checkInId = checkIn.id;
        });

        // Update it
        act(() => {
          result.current.updateCheckIn(checkInId!, {
            value: "60",
            confidence: "high",
            note: "Updated note",
          });
        });

        const checkIns = result.current.getCheckInsByKeyResult(keyResult.id);
        const updated = checkIns.find((c) => c.id === checkInId);

        expect(updated?.value).toBe("60");
        expect(updated?.confidence).toBe("high");
        expect(updated?.note).toBe("Updated note");
      }
    });

    it("updateCheckIn returns null for non-existent check-in", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      let updated: ReturnType<typeof result.current.updateCheckIn> = null;
      act(() => {
        updated = result.current.updateCheckIn("non-existent-id", { value: "100" });
      });

      expect(updated).toBeNull();
    });

    it("deleteCheckIn removes check-in", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        // Create a check-in first
        let checkInId: string;
        act(() => {
          const checkIn = result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "test-author",
            value: "40",
            previousValue: null,
            confidence: "medium",
            note: null,
            mentions: null,
          });
          checkInId = checkIn.id;
        });

        // Verify it exists
        let checkIns = result.current.getCheckInsByKeyResult(keyResult.id);
        expect(checkIns.find((c) => c.id === checkInId)).toBeDefined();

        // Delete it
        act(() => {
          result.current.deleteCheckIn(checkInId!);
        });

        // Verify it's gone (soft delete - won't appear in getCheckInsByKeyResult)
        checkIns = result.current.getCheckInsByKeyResult(keyResult.id);
        expect(checkIns.find((c) => c.id === checkInId)).toBeUndefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Check-In Sync Meta
  // ═══════════════════════════════════════════════════════════════════════════

  describe("check-in sync meta", () => {
    it("getCheckInSyncMeta returns null for unknown check-in", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const meta = result.current.getCheckInSyncMeta("unknown-id");
      expect(meta).toBeNull();
    });

    it("getCheckInSyncMeta returns sync info for existing check-in", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        let checkInId: string;
        act(() => {
          const checkIn = result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "test-author",
            value: "50",
            previousValue: null,
            confidence: "medium",
            note: null,
            mentions: null,
          });
          checkInId = checkIn.id;
        });

        const meta = result.current.getCheckInSyncMeta(checkInId!);
        expect(meta).not.toBeNull();
        expect(meta).toHaveProperty("syncStatus");
        expect(meta).toHaveProperty("error");
        expect(meta).toHaveProperty("nextRetryAt");
      }
    });

    it("new check-in has pending sync status", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        let checkInId: string;
        act(() => {
          const checkIn = result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "test-author",
            value: "75",
            previousValue: null,
            confidence: "high",
            note: null,
            mentions: null,
          });
          checkInId = checkIn.id;
        });

        const meta = result.current.getCheckInSyncMeta(checkInId!);
        expect(meta?.syncStatus).toBe("pending");
        expect(meta?.error).toBeNull();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Check-In History
  // ═══════════════════════════════════════════════════════════════════════════

  describe("check-in history", () => {
    it("checkInHistory is keyed by key result ID", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        // Create a check-in
        act(() => {
          result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "test-author",
            value: "100",
            previousValue: null,
            confidence: "high",
            note: null,
            mentions: null,
          });
        });

        const history = result.current.checkInHistory;
        expect(history[keyResult.id]).toBeDefined();
        expect(Array.isArray(history[keyResult.id])).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Reset to Seed
  // ═══════════════════════════════════════════════════════════════════════════

  describe("resetToSeed", () => {
    it("resets missions to seed values", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      // Make some changes
      const firstMission = result.current.missions[0];
      if (firstMission) {
        act(() => {
          result.current.setMissions((prev) =>
            prev.map((m) =>
              m.id === firstMission.id ? { ...m, title: "Modified Title" } : m
            )
          );
        });

        // Verify change
        expect(result.current.missions.find((m) => m.id === firstMission.id)?.title).toBe("Modified Title");

        // Reset
        act(() => {
          result.current.resetToSeed();
        });

        // Verify reset
        expect(result.current.missions.find((m) => m.id === firstMission.id)?.title).not.toBe("Modified Title");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Integration Scenarios
  // ═══════════════════════════════════════════════════════════════════════════

  describe("integration scenarios", () => {
    it("complete check-in workflow: create, update, delete", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        // Create
        let checkInId: string;
        act(() => {
          const checkIn = result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "test-author",
            value: "25",
            previousValue: null,
            confidence: "low",
            note: "Initial progress",
            mentions: null,
          });
          checkInId = checkIn.id;
        });

        let checkIns = result.current.getCheckInsByKeyResult(keyResult.id);
        expect(checkIns.find((c) => c.id === checkInId)).toBeDefined();

        // Update
        act(() => {
          result.current.updateCheckIn(checkInId!, {
            value: "75",
            confidence: "high",
            note: "Good progress!",
          });
        });

        checkIns = result.current.getCheckInsByKeyResult(keyResult.id);
        const updated = checkIns.find((c) => c.id === checkInId);
        expect(updated?.value).toBe("75");
        expect(updated?.confidence).toBe("high");

        // Delete
        act(() => {
          result.current.deleteCheckIn(checkInId!);
        });

        checkIns = result.current.getCheckInsByKeyResult(keyResult.id);
        expect(checkIns.find((c) => c.id === checkInId)).toBeUndefined();
      }
    });

    it("multiple check-ins for same key result", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });

      const mission = result.current.missions.find((m) => m.keyResults && m.keyResults.length > 0);
      const keyResult = mission?.keyResults?.[0];

      if (keyResult) {
        const initialCount = result.current.getCheckInsByKeyResult(keyResult.id).length;

        // Create multiple check-ins
        act(() => {
          result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "author-1",
            value: "25",
            previousValue: null,
            confidence: "low",
            note: null,
            mentions: null,
          });
        });

        act(() => {
          result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "author-1",
            value: "50",
            previousValue: "25",
            confidence: "medium",
            note: null,
            mentions: null,
          });
        });

        act(() => {
          result.current.createCheckIn({
            keyResultId: keyResult.id,
            authorId: "author-1",
            value: "75",
            previousValue: "50",
            confidence: "high",
            note: null,
            mentions: null,
          });
        });

        const checkIns = result.current.getCheckInsByKeyResult(keyResult.id);
        expect(checkIns.length).toBe(initialCount + 3);
      }
    });
  });
});
