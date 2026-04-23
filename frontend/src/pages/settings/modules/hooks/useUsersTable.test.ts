import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUsersTable } from "./useUsersTable";
import type { PeopleUserView } from "@/contexts/PeopleDataContext";

function createUser(overrides: Partial<PeopleUserView> = {}): PeopleUserView {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    orgId: "org-1",
    firstName: overrides.firstName ?? "Nome",
    lastName: overrides.lastName ?? "Sobrenome",
    email: overrides.email ?? "email@example.com",
    status: (overrides.status as PeopleUserView["status"]) ?? "active",
    roleType: overrides.roleType ?? "colaborador",
    teams: overrides.teams ?? [],
    initials: `${(overrides.firstName ?? "N")[0]}${(overrides.lastName ?? "S")[0]}`.toUpperCase(),
    managerId: null,
    avatarUrl: null,
    nickname: null,
    jobTitle: null,
    birthDate: null,
    gender: null,
    language: "pt-br",
    phone: null,
    invitedAt: null,
    activatedAt: null,
    lastLoginAt: null,
    authProvider: "email",
    authProviderId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    roleId: `role-org-1-${overrides.roleType ?? "colaborador"}`,
  };
}

const resolveRoleSlug = (roleType: string) => roleType;

describe("useUsersTable", () => {
  it("returns all users when no filters are active", () => {
    const users = [
      createUser({ firstName: "Ana" }),
      createUser({ firstName: "Bruno" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    expect(result.current.filtered.length).toBe(2);
    expect(result.current.rowIds.length).toBe(2);
  });

  it("filters users by search term (name)", () => {
    const users = [
      createUser({ firstName: "Ana", lastName: "Silva" }),
      createUser({ firstName: "Bruno", lastName: "Costa" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.setSearch("Ana");
    });

    expect(result.current.filtered.length).toBe(1);
    expect(result.current.filtered[0]!.firstName).toBe("Ana");
  });

  it("filters users by search term (email)", () => {
    const users = [
      createUser({ firstName: "Ana", email: "ana@empresa.com" }),
      createUser({ firstName: "Bruno", email: "bruno@gmail.com" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.setSearch("empresa");
    });

    expect(result.current.filtered.length).toBe(1);
    expect(result.current.filtered[0]!.email).toBe("ana@empresa.com");
  });

  it("filters users by status", () => {
    const users = [
      createUser({ firstName: "Ana", status: "active" }),
      createUser({ firstName: "Bruno", status: "inactive" }),
      createUser({ firstName: "Carlos", status: "invited" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.setFilterStatus("active");
    });
    // Status filter only applies when activeFilters includes "status"
    act(() => {
      result.current.addFilterAndOpen("status");
    });

    expect(result.current.filtered.length).toBe(1);
    expect(result.current.filtered[0]!.firstName).toBe("Ana");
  });

  it("filters users by role", () => {
    const users = [
      createUser({ firstName: "Ana", roleType: "admin" }),
      createUser({ firstName: "Bruno", roleType: "colaborador" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.setFilterRole("admin");
    });
    act(() => {
      result.current.addFilterAndOpen("role");
    });

    expect(result.current.filtered.length).toBe(1);
    expect(result.current.filtered[0]!.firstName).toBe("Ana");
  });

  it("search is case insensitive", () => {
    const users = [
      createUser({ firstName: "Maria", lastName: "Souza" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.setSearch("MARIA");
    });

    expect(result.current.filtered.length).toBe(1);
  });

  it("sorts users by name ascending", () => {
    const users = [
      createUser({ firstName: "Carlos" }),
      createUser({ firstName: "Ana" }),
      createUser({ firstName: "Bruno" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSort("name");
    });

    expect(result.current.filtered[0]!.firstName).toBe("Ana");
    expect(result.current.filtered[1]!.firstName).toBe("Bruno");
    expect(result.current.filtered[2]!.firstName).toBe("Carlos");
  });

  it("sorts users by name descending on second click", () => {
    const users = [
      createUser({ firstName: "Ana" }),
      createUser({ firstName: "Bruno" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSort("name");
    });
    act(() => {
      result.current.handleSort("name");
    });

    expect(result.current.filtered[0]!.firstName).toBe("Bruno");
    expect(result.current.filtered[1]!.firstName).toBe("Ana");
  });

  it("sorts users by status", () => {
    const users = [
      createUser({ firstName: "C", status: "invited" }),
      createUser({ firstName: "A", status: "active" }),
      createUser({ firstName: "B", status: "inactive" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSort("status");
    });

    const statuses = result.current.filtered.map((u) => u.status);
    expect(statuses).toEqual(["active", "inactive", "invited"]);
  });

  it("sorts users by role", () => {
    const users = [
      createUser({ firstName: "B", roleType: "gestor" }),
      createUser({ firstName: "A", roleType: "admin" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSort("role");
    });

    expect(result.current.filtered[0]!.roleType).toBe("admin");
    expect(result.current.filtered[1]!.roleType).toBe("gestor");
  });

  it("selects a row", () => {
    const users = [createUser({ id: "user-1" }), createUser({ id: "user-2" })];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSelectRow("user-1", true);
    });

    expect(result.current.selectedRows.has("user-1")).toBe(true);
    expect(result.current.selectedRows.has("user-2")).toBe(false);
  });

  it("deselects a row", () => {
    const users = [createUser({ id: "user-1" })];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSelectRow("user-1", true);
    });
    act(() => {
      result.current.handleSelectRow("user-1", false);
    });

    expect(result.current.selectedRows.has("user-1")).toBe(false);
  });

  it("selects all rows", () => {
    const users = [
      createUser({ id: "user-1" }),
      createUser({ id: "user-2" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSelectAll(true, ["user-1", "user-2"]);
    });

    expect(result.current.selectedRows.size).toBe(2);
  });

  it("deselects all rows", () => {
    const users = [createUser({ id: "user-1" })];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSelectRow("user-1", true);
    });
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedRows.size).toBe(0);
  });

  it("computes allSelectedInactive correctly", () => {
    const users = [
      createUser({ id: "user-1", status: "inactive" }),
      createUser({ id: "user-2", status: "inactive" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSelectAll(true, ["user-1", "user-2"]);
    });

    expect(result.current.allSelectedInactive).toBe(true);
  });

  it("computes allSelectedInactive as false when selection is empty", () => {
    const users = [createUser({ id: "user-1", status: "inactive" })];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    expect(result.current.allSelectedInactive).toBe(false);
  });

  it("computes allSelectedInactive as false when some are active", () => {
    const users = [
      createUser({ id: "user-1", status: "active" }),
      createUser({ id: "user-2", status: "inactive" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.handleSelectAll(true, ["user-1", "user-2"]);
    });

    expect(result.current.allSelectedInactive).toBe(false);
  });

  it("getFilterLabel returns correct status label", () => {
    const users = [createUser()];
    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.setFilterStatus("active");
    });

    expect(result.current.getFilterLabel("status", [])).toBe("Ativo");
  });

  it("getFilterLabel falls back for unknown status", () => {
    const users = [createUser()];
    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.setFilterStatus("unknown");
    });

    expect(result.current.getFilterLabel("status", [])).toBe("Status");
  });

  it("combines search and filters", () => {
    const users = [
      createUser({ firstName: "Ana", status: "active", roleType: "admin" }),
      createUser({ firstName: "AnaBeta", status: "inactive", roleType: "admin" }),
      createUser({ firstName: "Bruno", status: "active", roleType: "colaborador" }),
    ];

    const { result } = renderHook(() => useUsersTable(users, resolveRoleSlug));

    act(() => {
      result.current.setSearch("Ana");
    });
    act(() => {
      result.current.setFilterStatus("active");
      result.current.addFilterAndOpen("status");
    });

    expect(result.current.filtered.length).toBe(1);
    expect(result.current.filtered[0]!.firstName).toBe("Ana");
  });
});
