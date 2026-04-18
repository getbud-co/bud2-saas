/**
 * Tests for SavedViewsContext
 *
 * This context manages saved filter views for missions and surveys modules.
 * It provides CRUD operations for saving, updating, and deleting filter configurations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { SavedViewsProvider, useSavedViews, type SavedView, type SavedViewFilters } from "./SavedViewsContext";

// ─── Test Helpers ───

function wrapper({ children }: { children: ReactNode }) {
  return <SavedViewsProvider>{children}</SavedViewsProvider>;
}

function createTestFilters(overrides?: Partial<SavedViewFilters>): SavedViewFilters {
  return {
    activeFilters: [],
    selectedTeams: [],
    selectedPeriod: [null, null],
    selectedStatus: "all",
    selectedOwners: [],
    ...overrides,
  };
}

function createTestView(overrides?: Partial<Omit<SavedView, "id">>): Omit<SavedView, "id"> {
  return {
    name: "Test View",
    module: "missions",
    filters: createTestFilters(),
    ...overrides,
  };
}

// ─── Tests ───

describe("SavedViewsContext", () => {
  let timeCounter = 1000000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure each Date.now() call returns a unique value
    vi.spyOn(Date, "now").mockImplementation(() => timeCounter++);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Default Context (without Provider)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("default context", () => {
    it("has empty views array", () => {
      const { result } = renderHook(() => useSavedViews());
      expect(result.current.views).toEqual([]);
    });

    it("addView returns empty string", () => {
      const { result } = renderHook(() => useSavedViews());
      const id = result.current.addView(createTestView());
      expect(id).toBe("");
    });

    it("updateView is a no-op", () => {
      const { result } = renderHook(() => useSavedViews());
      // Should not throw
      result.current.updateView("test-id", { name: "Updated" });
      expect(result.current.views).toEqual([]);
    });

    it("deleteView is a no-op", () => {
      const { result } = renderHook(() => useSavedViews());
      // Should not throw
      result.current.deleteView("test-id");
      expect(result.current.views).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State (with Provider)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("starts with empty views array", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });
      expect(result.current.views).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // addView
  // ═══════════════════════════════════════════════════════════════════════════

  describe("addView", () => {
    it("adds a view and returns its ID", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView());
      });

      expect(viewId!).toMatch(/^view-\d+$/);
      expect(result.current.views).toHaveLength(1);
    });

    it("generates unique IDs for each view", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let id1 = "";
      let id2 = "";

      act(() => {
        id1 = result.current.addView(createTestView({ name: "View 1" }));
      });

      act(() => {
        id2 = result.current.addView(createTestView({ name: "View 2" }));
      });

      expect(id1).not.toBe(id2);
    });

    it("stores view with correct data", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      const viewData = createTestView({
        name: "My Custom View",
        module: "surveys",
        filters: createTestFilters({
          activeFilters: ["status", "team"],
          selectedTeams: ["team-1", "team-2"],
          selectedStatus: "active",
        }),
      });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(viewData);
      });

      const savedView = result.current.views.find((v) => v.id === viewId);
      expect(savedView).toBeDefined();
      expect(savedView!.name).toBe("My Custom View");
      expect(savedView!.module).toBe("surveys");
      expect(savedView!.filters.activeFilters).toEqual(["status", "team"]);
      expect(savedView!.filters.selectedTeams).toEqual(["team-1", "team-2"]);
      expect(savedView!.filters.selectedStatus).toBe("active");
    });

    it("adds multiple views", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      act(() => {
        result.current.addView(createTestView({ name: "View 1" }));
      });

      act(() => {
        result.current.addView(createTestView({ name: "View 2" }));
      });

      act(() => {
        result.current.addView(createTestView({ name: "View 3" }));
      });

      expect(result.current.views).toHaveLength(3);
    });

    it("preserves existing views when adding new one", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let firstId: string;
      act(() => {
        firstId = result.current.addView(createTestView({ name: "First View" }));
      });

      act(() => {
        result.current.addView(createTestView({ name: "Second View" }));
      });

      expect(result.current.views).toHaveLength(2);
      expect(result.current.views.find((v) => v.id === firstId)).toBeDefined();
    });

    it("stores mission-specific filters", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      const missionFilters = createTestFilters({
        selectedItemTypes: ["objective", "key-result"],
        selectedIndicatorTypes: ["percentage", "number"],
        selectedContributions: ["on-track", "attention"],
        selectedTaskState: "in-progress",
        selectedMissionStatuses: ["active"],
      });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView({
          module: "missions",
          filters: missionFilters,
        }));
      });

      const savedView = result.current.views.find((v) => v.id === viewId);
      expect(savedView!.filters.selectedItemTypes).toEqual(["objective", "key-result"]);
      expect(savedView!.filters.selectedIndicatorTypes).toEqual(["percentage", "number"]);
      expect(savedView!.filters.selectedContributions).toEqual(["on-track", "attention"]);
      expect(savedView!.filters.selectedTaskState).toBe("in-progress");
      expect(savedView!.filters.selectedMissionStatuses).toEqual(["active"]);
    });

    it("stores survey-specific filters", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      const surveyFilters = createTestFilters({
        selectedType: "engagement",
        selectedCategory: "quarterly",
      });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView({
          module: "surveys",
          filters: surveyFilters,
        }));
      });

      const savedView = result.current.views.find((v) => v.id === viewId);
      expect(savedView!.filters.selectedType).toBe("engagement");
      expect(savedView!.filters.selectedCategory).toBe("quarterly");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // updateView
  // ═══════════════════════════════════════════════════════════════════════════

  describe("updateView", () => {
    it("updates view name", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView({ name: "Original Name" }));
      });

      act(() => {
        result.current.updateView(viewId!, { name: "Updated Name" });
      });

      const updatedView = result.current.views.find((v) => v.id === viewId);
      expect(updatedView!.name).toBe("Updated Name");
    });

    it("updates view module", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView({ module: "missions" }));
      });

      act(() => {
        result.current.updateView(viewId!, { module: "surveys" });
      });

      const updatedView = result.current.views.find((v) => v.id === viewId);
      expect(updatedView!.module).toBe("surveys");
    });

    it("updates view filters", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView({
          filters: createTestFilters({ selectedStatus: "all" }),
        }));
      });

      act(() => {
        result.current.updateView(viewId!, {
          filters: createTestFilters({
            selectedStatus: "active",
            selectedTeams: ["team-1"],
          }),
        });
      });

      const updatedView = result.current.views.find((v) => v.id === viewId);
      expect(updatedView!.filters.selectedStatus).toBe("active");
      expect(updatedView!.filters.selectedTeams).toEqual(["team-1"]);
    });

    it("preserves non-updated fields", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView({
          name: "Original Name",
          module: "missions",
          filters: createTestFilters({ selectedStatus: "active" }),
        }));
      });

      act(() => {
        result.current.updateView(viewId!, { name: "New Name" });
      });

      const updatedView = result.current.views.find((v) => v.id === viewId);
      expect(updatedView!.name).toBe("New Name");
      expect(updatedView!.module).toBe("missions"); // preserved
      expect(updatedView!.filters.selectedStatus).toBe("active"); // preserved
    });

    it("does not affect other views", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let id1 = "";
      let id2 = "";

      act(() => {
        id1 = result.current.addView(createTestView({ name: "View 1" }));
      });

      act(() => {
        id2 = result.current.addView(createTestView({ name: "View 2" }));
      });

      act(() => {
        result.current.updateView(id1, { name: "Updated View 1" });
      });

      const view1 = result.current.views.find((v) => v.id === id1);
      const view2 = result.current.views.find((v) => v.id === id2);

      expect(view1!.name).toBe("Updated View 1");
      expect(view2!.name).toBe("View 2"); // unchanged
    });

    it("handles non-existent view ID gracefully", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      act(() => {
        result.current.addView(createTestView({ name: "Existing" }));
      });

      act(() => {
        result.current.updateView("non-existent-id", { name: "Updated" });
      });

      // Should not add new view or throw
      expect(result.current.views).toHaveLength(1);
      expect(result.current.views[0]!.name).toBe("Existing");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // deleteView
  // ═══════════════════════════════════════════════════════════════════════════

  describe("deleteView", () => {
    it("removes a view", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView());
      });

      expect(result.current.views).toHaveLength(1);

      act(() => {
        result.current.deleteView(viewId!);
      });

      expect(result.current.views).toHaveLength(0);
    });

    it("removes correct view when multiple exist", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      let id1 = "";
      let id2 = "";
      let id3 = "";

      act(() => {
        id1 = result.current.addView(createTestView({ name: "View 1" }));
      });

      act(() => {
        id2 = result.current.addView(createTestView({ name: "View 2" }));
      });

      act(() => {
        id3 = result.current.addView(createTestView({ name: "View 3" }));
      });

      act(() => {
        result.current.deleteView(id2);
      });

      expect(result.current.views).toHaveLength(2);
      expect(result.current.views.find((v) => v.id === id1)).toBeDefined();
      expect(result.current.views.find((v) => v.id === id2)).toBeUndefined();
      expect(result.current.views.find((v) => v.id === id3)).toBeDefined();
    });

    it("handles non-existent view ID gracefully", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      act(() => {
        result.current.addView(createTestView({ name: "Existing" }));
      });

      act(() => {
        result.current.deleteView("non-existent-id");
      });

      // Should not remove existing view or throw
      expect(result.current.views).toHaveLength(1);
    });

    it("handles deleting from empty list gracefully", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      act(() => {
        result.current.deleteView("any-id");
      });

      expect(result.current.views).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Integration Scenarios
  // ═══════════════════════════════════════════════════════════════════════════

  describe("integration scenarios", () => {
    it("typical workflow: create, update, delete", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      // User creates a saved view
      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView({
          name: "My Team's OKRs",
          module: "missions",
          filters: createTestFilters({
            selectedTeams: ["team-engineering"],
            selectedStatus: "active",
          }),
        }));
      });

      expect(result.current.views).toHaveLength(1);

      // User updates the view to add more filters
      act(() => {
        result.current.updateView(viewId!, {
          filters: createTestFilters({
            selectedTeams: ["team-engineering"],
            selectedStatus: "active",
            selectedOwners: ["user-1", "user-2"],
            activeFilters: ["team", "status", "owner"],
          }),
        });
      });

      const updated = result.current.views.find((v) => v.id === viewId);
      expect(updated!.filters.selectedOwners).toEqual(["user-1", "user-2"]);

      // User renames the view
      act(() => {
        result.current.updateView(viewId!, { name: "Engineering Q1 OKRs" });
      });

      expect(result.current.views.find((v) => v.id === viewId)!.name).toBe("Engineering Q1 OKRs");

      // User deletes the view
      act(() => {
        result.current.deleteView(viewId!);
      });

      expect(result.current.views).toHaveLength(0);
    });

    it("managing views for different modules", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      // Create mission views
      let missionViewId = "";
      act(() => {
        missionViewId = result.current.addView(createTestView({
          name: "All OKRs",
          module: "missions",
        }));
      });

      // Create survey views
      let surveyViewId = "";
      act(() => {
        surveyViewId = result.current.addView(createTestView({
          name: "Active Surveys",
          module: "surveys",
          filters: createTestFilters({
            selectedType: "engagement",
          }),
        }));
      });

      // Filter views by module
      const missionViews = result.current.views.filter((v) => v.module === "missions");
      const surveyViews = result.current.views.filter((v) => v.module === "surveys");

      expect(missionViews).toHaveLength(1);
      expect(surveyViews).toHaveLength(1);
      expect(missionViews[0]!.id).toBe(missionViewId);
      expect(surveyViews[0]!.id).toBe(surveyViewId);
    });

    it("complex filter configurations", () => {
      const { result } = renderHook(() => useSavedViews(), { wrapper });

      const complexFilters = createTestFilters({
        activeFilters: ["team", "period", "status", "owner", "itemType"],
        selectedTeams: ["team-1", "team-2", "team-3"],
        selectedPeriod: [
          { year: 2026, month: 1, day: 1 },
          { year: 2026, month: 3, day: 31 },
        ],
        selectedStatus: "on-track",
        selectedOwners: ["user-1", "user-2"],
        selectedItemTypes: ["objective", "key-result", "task"],
        selectedIndicatorTypes: ["percentage", "number", "currency"],
        selectedContributions: ["on-track", "attention"],
        selectedTaskState: "all",
        selectedMissionStatuses: ["active", "completed"],
      });

      let viewId: string;
      act(() => {
        viewId = result.current.addView(createTestView({
          name: "Complex View",
          module: "missions",
          filters: complexFilters,
        }));
      });

      const savedView = result.current.views.find((v) => v.id === viewId);

      // Verify all complex filters are preserved
      expect(savedView!.filters.activeFilters).toHaveLength(5);
      expect(savedView!.filters.selectedTeams).toHaveLength(3);
      expect(savedView!.filters.selectedPeriod[0]).toEqual({ year: 2026, month: 1, day: 1 });
      expect(savedView!.filters.selectedPeriod[1]).toEqual({ year: 2026, month: 3, day: 31 });
      expect(savedView!.filters.selectedOwners).toHaveLength(2);
      expect(savedView!.filters.selectedItemTypes).toHaveLength(3);
      expect(savedView!.filters.selectedMissionStatuses).toHaveLength(2);
    });
  });
});
