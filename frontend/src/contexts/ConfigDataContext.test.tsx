/**
 * Tests for ConfigDataContext
 *
 * This context provides React state management for configuration data including
 * organizations, tags, cycles, roles, company values, and permissions.
 * It wraps the config-store with CRUD operations and legacy ID resolution.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import type { Cycle } from "@/types";
import {
  createCycle as createCycleApi,
  deleteCycle as deleteCycleApi,
  listCycles,
  updateCycle as updateCycleApi,
} from "@/lib/cycles-api";
import { ConfigDataProvider, useConfigData } from "./ConfigDataContext";

vi.mock("@/lib/cycles-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cycles-api")>("@/lib/cycles-api");
  return {
    ...actual,
    createCycle: vi.fn(),
    deleteCycle: vi.fn(),
    listCycles: vi.fn(),
    updateCycle: vi.fn(),
  };
});

// ─── Test Helpers ───

function wrapper({ children }: { children: ReactNode }) {
  return <ConfigDataProvider>{children}</ConfigDataProvider>;
}

function authenticatedWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        initializing: false,
        user: null,
        activeOrganization: {
          id: "api-org-9",
          name: "API Org",
          domain: "api-org.example.com",
          workspace: "api-org",
          status: "active",
          membership_role: "super-admin",
          membership_status: "active",
        },
        organizations: [
          {
            id: "api-org-9",
            name: "API Org",
            domain: "api-org.example.com",
            workspace: "api-org",
            status: "active",
            membership_role: "super-admin",
            membership_status: "active",
          },
        ],
        login: async () => {},
        switchOrganization: async () => {},
        logout: () => {},
        getToken: () => "test-token",
      }}
    >
      <ConfigDataProvider>{children}</ConfigDataProvider>
    </AuthContext.Provider>
  );
}

const apiCycle = {
  id: "11111111-1111-4111-8111-111111111111",
  org_id: "api-org-9",
  name: "Q1 2026",
  type: "quarterly" as const,
  start_date: "2026-01-01",
  end_date: "2026-03-31",
  status: "active" as const,
  okr_definition_deadline: null,
  mid_review_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const createdApiCycle = {
  ...apiCycle,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Q2 2026",
  start_date: "2026-04-01",
  end_date: "2026-06-30",
  status: "planning" as const,
  okr_definition_deadline: "2026-04-15",
  mid_review_date: "2026-05-15",
};

// ─── Tests ───

describe("ConfigDataContext", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("bud.test.access-token", "test-token");
    vi.clearAllMocks();
    vi.mocked(listCycles).mockResolvedValue({ data: [apiCycle], total: 1, page: 1, size: 100 });
    vi.mocked(createCycleApi).mockResolvedValue(createdApiCycle);
    vi.mocked(updateCycleApi).mockResolvedValue({
      ...createdApiCycle,
      name: "Updated Cycle",
      status: "active",
      updated_at: "2026-01-02T00:00:00Z",
    });
    vi.mocked(deleteCycleApi).mockResolvedValue(undefined);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("context setup", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useConfigData());
      }).toThrow("useConfigData must be used within ConfigDataProvider");
    });

    it("provides context when used with provider", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(result.current).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("has default active org", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(result.current.activeOrgId).toBe("org-1");
    });

    it("has organizations array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(result.current.organizations.length).toBeGreaterThan(0);
    });

    it("has active organization", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(result.current.activeOrganization).not.toBeNull();
      expect(result.current.activeOrganization?.id).toBe("org-1");
    });

    it("has tags array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(Array.isArray(result.current.tags)).toBe(true);
    });

    it("has cycles array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(Array.isArray(result.current.cycles)).toBe(true);
      expect(result.current.cycles).toHaveLength(0);
    });

    it("has roles array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(Array.isArray(result.current.roles)).toBe(true);
      expect(result.current.roles.length).toBeGreaterThan(0);
    });

    it("has permissions array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(Array.isArray(result.current.permissions)).toBe(true);
    });

    it("has company values array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(Array.isArray(result.current.companyValues)).toBe(true);
    });

    it("has updatedAt timestamp", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(result.current.updatedAt).toBeDefined();
      expect(new Date(result.current.updatedAt).getTime()).toBeGreaterThan(0);
    });

    it("locks legacy local data to org-1 when session org comes from API", () => {
      const { result } = renderHook(() => useConfigData(), {
        wrapper: authenticatedWrapper,
      });

      expect(result.current.activeOrgId).toBe("org-1");
      expect(result.current.activeOrganization?.id).toBe("org-1");
      expect(result.current.organizations).toHaveLength(1);
      expect(result.current.organizations[0]?.id).toBe("api-org-9");
      expect(result.current.roles.length).toBeGreaterThan(0);
      expect(result.current.roles.every((role) => role.orgId === "org-1")).toBe(true);
      expect(result.current.roleOptions.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Derived Options
  // ═══════════════════════════════════════════════════════════════════════════

  describe("derived options", () => {
    it("provides roleOptions array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(Array.isArray(result.current.roleOptions)).toBe(true);

      if (result.current.roleOptions.length > 0) {
        const option = result.current.roleOptions[0]!;
        expect(option).toHaveProperty("id");
        expect(option).toHaveProperty("value");
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("description");
        expect(option).toHaveProperty("type");
        expect(option).toHaveProperty("scope");
        expect(option).toHaveProperty("isDefault");
      }
    });

    it("provides tagOptions array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(Array.isArray(result.current.tagOptions)).toBe(true);

      // Add a tag to test options
      act(() => {
        result.current.createTag({ name: "Test Tag", color: "orange" });
      });

      const option = result.current.tagOptions.find((t) => t.label === "Test Tag");
      expect(option).toBeDefined();
      expect(option).toHaveProperty("id");
      expect(option).toHaveProperty("label");
      expect(option).toHaveProperty("color");
    });

    it("provides cyclePresetOptions array", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      expect(Array.isArray(result.current.cyclePresetOptions)).toBe(true);

      if (result.current.cyclePresetOptions.length > 0) {
        const option = result.current.cyclePresetOptions[0]!;
        expect(option).toHaveProperty("id");
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("startDate");
        expect(option).toHaveProperty("endDate");
        expect(option).toHaveProperty("status");
      }
    });
  });

  describe("roles and permissions snapshot", () => {
    it("keeps roles and permissions local when authenticated", async () => {
      const { result } = renderHook(() => useConfigData(), {
        wrapper: authenticatedWrapper,
      });

      await waitFor(() => {
        expect(result.current.activeOrgId).toBe("org-1");
      });

      expect(result.current.rolesStatus).toBe("idle");
      expect(result.current.roles.map((role) => role.slug)).toContain("super-admin");
      expect(result.current.roleOptions.map((role) => role.value)).toContain("colaborador");
      expect(result.current.permissions.map((permission) => permission.id)).toContain("people.view");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Organization Management
  // ═══════════════════════════════════════════════════════════════════════════

  describe("organization management", () => {
    it("can switch active org", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      // Check initial org
      expect(result.current.activeOrgId).toBe("org-1");

      // Find another org
      const otherOrg = result.current.organizations.find((o) => o.id !== "org-1");
      if (otherOrg) {
        act(() => {
          result.current.setActiveOrgId(otherOrg.id);
        });

        expect(result.current.activeOrgId).toBe(otherOrg.id);
        expect(result.current.activeOrganization?.id).toBe(otherOrg.id);
      }
    });

    it("ignores invalid org ID", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      act(() => {
        result.current.setActiveOrgId("non-existent-org");
      });

      // Should remain unchanged
      expect(result.current.activeOrgId).toBe("org-1");
    });

    it("can update company profile", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      const originalName = result.current.activeOrganization?.name;

      act(() => {
        result.current.updateCompanyProfile({ name: "Updated Company Name" });
      });

      expect(result.current.activeOrganization?.name).toBe("Updated Company Name");
      expect(result.current.activeOrganization?.name).not.toBe(originalName);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tags CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  describe("tags CRUD", () => {
    it("creates a tag", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      const initialCount = result.current.tags.length;

      let newTag: ReturnType<typeof result.current.createTag>;
      act(() => {
        newTag = result.current.createTag({ name: "New Tag", color: "orange" });
      });

      expect(result.current.tags.length).toBe(initialCount + 1);
      expect(newTag!.name).toBe("New Tag");
      expect(newTag!.color).toBe("orange");
      expect(newTag!.id).toBeDefined();
    });

    it("creates tag with default color", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let newTag: ReturnType<typeof result.current.createTag>;
      act(() => {
        newTag = result.current.createTag({ name: "Default Color Tag" });
      });

      expect(newTag!.color).toBe("neutral");
    });

    it("updates a tag", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let tagId: string;
      act(() => {
        const tag = result.current.createTag({ name: "Original", color: "orange" });
        tagId = tag.id;
      });

      act(() => {
        result.current.updateTag(tagId!, { name: "Updated", color: "wine" });
      });

      const updated = result.current.tags.find((t) => t.id === tagId);
      expect(updated?.name).toBe("Updated");
      expect(updated?.color).toBe("wine");
    });

    it("deletes a tag", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let tagId: string;
      act(() => {
        const tag = result.current.createTag({ name: "To Delete" });
        tagId = tag.id;
      });

      const countBefore = result.current.tags.length;

      act(() => {
        result.current.deleteTag(tagId!);
      });

      expect(result.current.tags.length).toBe(countBefore - 1);
      expect(result.current.tags.find((t) => t.id === tagId)).toBeUndefined();
    });

    it("getTagById returns tag", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let tagId: string;
      act(() => {
        const tag = result.current.createTag({ name: "Findable" });
        tagId = tag.id;
      });

      const found = result.current.getTagById(tagId!);
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Findable");
    });

    it("getTagById returns null for non-existent", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });
      const found = result.current.getTagById("non-existent");
      expect(found).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Cycles CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  describe("cycles CRUD", () => {
    it("loads cycles from the API", async () => {
      const { result } = renderHook(() => useConfigData(), { wrapper: authenticatedWrapper });

      await waitFor(() => expect(result.current.cyclesStatus).toBe("ready"));

      expect(result.current.cycles).toHaveLength(1);
      expect(result.current.cycles[0]?.id).toBe(apiCycle.id);
      expect(listCycles).toHaveBeenCalledWith("test-token", { size: 100 });
    });

    it("creates a cycle", async () => {
      const { result } = renderHook(() => useConfigData(), { wrapper: authenticatedWrapper });

      await waitFor(() => expect(result.current.cyclesStatus).toBe("ready"));

      const initialCount = result.current.cycles.length;

      let newCycle: Cycle | undefined;
      await act(async () => {
        newCycle = await result.current.createCycle({
          name: "Q2 2026",
          type: "quarterly",
          startDate: "2026-04-01",
          endDate: "2026-06-30",
          status: "planning",
          okrDefinitionDeadline: "2026-04-15",
          midReviewDate: "2026-05-15",
        });
      });

      expect(result.current.cycles.length).toBe(initialCount + 1);
      expect(newCycle!.name).toBe("Q2 2026");
      expect(newCycle!.type).toBe("quarterly");
      expect(newCycle!.status).toBe("planning");
      expect(createCycleApi).toHaveBeenCalledWith(
        {
          name: "Q2 2026",
          type: "quarterly",
          start_date: "2026-04-01",
          end_date: "2026-06-30",
          status: "planning",
          okr_definition_deadline: "2026-04-15",
          mid_review_date: "2026-05-15",
        },
        "test-token",
      );
    });

    it("uses the backend ID when creating a cycle", async () => {
      const { result } = renderHook(() => useConfigData(), { wrapper: authenticatedWrapper });

      await waitFor(() => expect(result.current.cyclesStatus).toBe("ready"));

      let newCycle: Cycle | undefined;
      await act(async () => {
        newCycle = await result.current.createCycle({
          name: "Custom Cycle",
          type: "custom",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          status: "active",
          okrDefinitionDeadline: null,
          midReviewDate: null,
        });
      });

      expect(newCycle!.id).toBe(createdApiCycle.id);
    });

    it("updates a cycle", async () => {
      const { result } = renderHook(() => useConfigData(), { wrapper: authenticatedWrapper });

      await waitFor(() => expect(result.current.cyclesStatus).toBe("ready"));

      let cycleId: string;
      await act(async () => {
        const cycle = await result.current.createCycle({
          name: "Original Cycle",
          type: "quarterly",
          startDate: "2026-01-01",
          endDate: "2026-03-31",
          status: "planning",
          okrDefinitionDeadline: null,
          midReviewDate: null,
        });
        cycleId = cycle.id;
      });

      await act(async () => {
        await result.current.updateCycle(cycleId!, { name: "Updated Cycle", status: "active" });
      });

      const updated = result.current.cycles.find((c) => c.id === cycleId);
      expect(updated?.name).toBe("Updated Cycle");
      expect(updated?.status).toBe("active");
    });

    it("deletes a cycle", async () => {
      const { result } = renderHook(() => useConfigData(), { wrapper: authenticatedWrapper });

      await waitFor(() => expect(result.current.cyclesStatus).toBe("ready"));

      let cycleId: string;
      await act(async () => {
        const cycle = await result.current.createCycle({
          name: "To Delete",
          type: "quarterly",
          startDate: "2026-01-01",
          endDate: "2026-03-31",
          status: "planning",
          okrDefinitionDeadline: null,
          midReviewDate: null,
        });
        cycleId = cycle.id;
      });

      const countBefore = result.current.cycles.length;

      await act(async () => {
        await result.current.deleteCycle(cycleId!);
      });

      expect(result.current.cycles.length).toBe(countBefore - 1);
    });

    it("getCycleById returns cycle", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      // Use an existing cycle from seed
      const firstCycle = result.current.cycles[0];
      if (firstCycle) {
        const found = result.current.getCycleById(firstCycle.id);
        expect(found).not.toBeNull();
        expect(found?.id).toBe(firstCycle.id);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Roles CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  describe("roles CRUD", () => {
    it("creates a custom role", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      const initialCount = result.current.roles.length;

      let newRole: ReturnType<typeof result.current.createRole>;
      act(() => {
        newRole = result.current.createRole({
          name: "Tech Lead",
          description: "Technical leadership role",
          type: "custom",
          scope: "team",
        });
      });

      expect(result.current.roles.length).toBe(initialCount + 1);
      expect(newRole!.name).toBe("Tech Lead");
      expect(newRole!.type).toBe("custom");
      expect(newRole!.scope).toBe("team");
      expect(newRole!.slug).toBeDefined();
    });

    it("creates role with unique slug", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let role1: ReturnType<typeof result.current.createRole>;
      let role2: ReturnType<typeof result.current.createRole>;

      act(() => {
        role1 = result.current.createRole({ name: "Manager" });
      });

      act(() => {
        role2 = result.current.createRole({ name: "Manager" });
      });

      expect(role1!.slug).not.toBe(role2!.slug);
    });

    it("updates a custom role", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let roleId: string;
      act(() => {
        const role = result.current.createRole({
          name: "Original Role",
          description: "Original description",
        });
        roleId = role.id;
      });

      act(() => {
        result.current.updateRole(roleId!, {
          name: "Updated Role",
          description: "Updated description",
        });
      });

      const updated = result.current.roles.find((r) => r.id === roleId);
      expect(updated?.name).toBe("Updated Role");
      expect(updated?.description).toBe("Updated description");
    });

    it("cannot update system roles", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      const systemRole = result.current.roles.find((r) => r.type === "system");
      if (systemRole) {
        const originalName = systemRole.name;

        act(() => {
          result.current.updateRole(systemRole.id, { name: "Hacked Name" });
        });

        const afterUpdate = result.current.roles.find((r) => r.id === systemRole.id);
        expect(afterUpdate?.name).toBe(originalName);
      }
    });

    it("deletes a custom role", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let roleId: string;
      act(() => {
        const role = result.current.createRole({ name: "To Delete" });
        roleId = role.id;
      });

      const countBefore = result.current.roles.length;

      let deleted: boolean;
      act(() => {
        deleted = result.current.deleteRole(roleId!);
      });

      expect(deleted!).toBe(true);
      expect(result.current.roles.length).toBe(countBefore - 1);
    });

    it("cannot delete system roles", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      const systemRole = result.current.roles.find((r) => r.type === "system");
      if (systemRole) {
        const countBefore = result.current.roles.length;

        let deleted: boolean;
        act(() => {
          deleted = result.current.deleteRole(systemRole.id);
        });

        expect(deleted!).toBe(false);
        expect(result.current.roles.length).toBe(countBefore);
      }
    });

    it("getRoleBySlug returns role", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let roleSlug: string;
      act(() => {
        const role = result.current.createRole({ name: "Findable Role" });
        roleSlug = role.slug;
      });

      const found = result.current.getRoleBySlug(roleSlug!);
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Findable Role");
    });

    it("creates default role and unsets others", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      // Create first default role
      let role1: ReturnType<typeof result.current.createRole>;
      act(() => {
        role1 = result.current.createRole({
          name: "First Default",
          isDefault: true,
        });
      });

      expect(role1!.isDefault).toBe(true);

      // Create second default role
      let role2: ReturnType<typeof result.current.createRole>;
      act(() => {
        role2 = result.current.createRole({
          name: "Second Default",
          isDefault: true,
        });
      });

      // Second should be default
      expect(role2!.isDefault).toBe(true);

      // First should no longer be default
      const updatedRole1 = result.current.roles.find((r) => r.id === role1!.id);
      expect(updatedRole1?.isDefault).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Company Values CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  describe("company values CRUD", () => {
    it("creates a company value", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      const initialCount = result.current.companyValues.length;

      let newValue: ReturnType<typeof result.current.createCompanyValue>;
      act(() => {
        newValue = result.current.createCompanyValue({
          name: "Innovation",
          description: "We value creative solutions",
        });
      });

      expect(result.current.companyValues.length).toBe(initialCount + 1);
      expect(newValue!.name).toBe("Innovation");
      expect(newValue!.description).toBe("We value creative solutions");
    });

    it("updates a company value", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let valueId: string;
      act(() => {
        const value = result.current.createCompanyValue({
          name: "Original",
          description: "Original desc",
        });
        valueId = value.id;
      });

      act(() => {
        result.current.updateCompanyValue(valueId!, {
          name: "Updated",
          description: "Updated desc",
        });
      });

      const updated = result.current.companyValues.find((v) => v.id === valueId);
      expect(updated?.name).toBe("Updated");
      expect(updated?.description).toBe("Updated desc");
    });

    it("deletes a company value", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let valueId: string;
      act(() => {
        const value = result.current.createCompanyValue({
          name: "To Delete",
          description: "Will be deleted",
        });
        valueId = value.id;
      });

      const countBefore = result.current.companyValues.length;

      act(() => {
        result.current.deleteCompanyValue(valueId!);
      });

      expect(result.current.companyValues.length).toBe(countBefore - 1);
    });

    it("getCompanyValueById returns value", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let valueId: string;
      act(() => {
        const value = result.current.createCompanyValue({
          name: "Findable",
          description: "Can be found",
        });
        valueId = value.id;
      });

      const found = result.current.getCompanyValueById(valueId!);
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Findable");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ID Resolution
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ID resolution", () => {
    it("resolveRoleSlug returns canonical slug", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let roleSlug: string;
      act(() => {
        const role = result.current.createRole({ name: "Test Role" });
        roleSlug = role.slug;
      });

      const resolved = result.current.resolveRoleSlug(roleSlug!);
      expect(resolved).toBe(roleSlug!);
    });

    it("resolveCycleId returns canonical ID", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      const firstCycle = result.current.cycles[0];
      if (firstCycle) {
        const resolved = result.current.resolveCycleId(firstCycle.id);
        expect(resolved).toBe(firstCycle.id);
      }
    });

    it("resolveTagId returns canonical ID", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      let tagId: string;
      act(() => {
        const tag = result.current.createTag({ name: "Test Tag" });
        tagId = tag.id;
      });

      const resolved = result.current.resolveTagId(tagId!);
      expect(resolved).toBe(tagId!);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Reset to Seed
  // ═══════════════════════════════════════════════════════════════════════════

  describe("resetToSeed", () => {
    it("resets all data to seed values", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      // Make some changes
      act(() => {
        result.current.createTag({ name: "Custom Tag" });
        result.current.createRole({ name: "Custom Role" });
        result.current.createCompanyValue({ name: "Custom Value", description: "desc" });
      });

      // Verify custom items exist
      expect(result.current.tags.find((t) => t.name === "Custom Tag")).toBeDefined();
      expect(result.current.roles.find((r) => r.name === "Custom Role")).toBeDefined();

      act(() => {
        result.current.resetToSeed();
      });

      // Custom items should be gone
      expect(result.current.tags.find((t) => t.name === "Custom Tag")).toBeUndefined();
      expect(result.current.roles.find((r) => r.name === "Custom Role")).toBeUndefined();
      expect(result.current.companyValues.find((v) => v.name === "Custom Value")).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Direct State Setters
  // ═══════════════════════════════════════════════════════════════════════════

  describe("direct state setters", () => {
    it("setTags allows direct state setting", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      act(() => {
        result.current.setTags([]);
      });

      expect(result.current.tags.length).toBe(0);
    });

    it("setCycles allows direct state setting", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      act(() => {
        result.current.setCycles([
          {
            id: "local-cycle",
            orgId: "org-1",
            name: "Local Cycle",
            type: "custom",
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            status: "planning",
            okrDefinitionDeadline: null,
            midReviewDate: null,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ]);
      });

      expect(result.current.cycles.length).toBe(1);
    });

    it("setRoles allows direct state setting", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      // Get only system roles
      const systemRoles = result.current.roles.filter((r) => r.type === "system");

      act(() => {
        result.current.setRoles(systemRoles);
      });

      expect(result.current.roles.every((r) => r.type === "system")).toBe(true);
    });

    it("setCompanyValues allows direct state setting", () => {
      const { result } = renderHook(() => useConfigData(), { wrapper });

      act(() => {
        result.current.setCompanyValues([]);
      });

      expect(result.current.companyValues.length).toBe(0);
    });
  });
});
