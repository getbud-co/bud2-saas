/**
 * Tests for PeopleDataContext
 *
 * This context provides React state management for people data including
 * users, teams, and organization members. It depends on ConfigDataContext
 * for the active organization ID.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigDataProvider } from "./ConfigDataContext";
import { AuthContext } from "./AuthContext";
import { PeopleDataProvider, usePeopleData } from "./PeopleDataContext";

// ─── Test Helpers ───

const nullAuthValue = {
  isAuthenticated: false,
  initializing: false,
  user: null,
  activeOrganization: null,
  organizations: [],
  login: async () => {},
  switchOrganization: async () => {},
  logout: () => {},
  getToken: () => null,
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={nullAuthValue}>
        <ConfigDataProvider>
          <PeopleDataProvider>{children}</PeopleDataProvider>
        </ConfigDataProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

// ─── Tests ───

describe("PeopleDataContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("context setup", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => usePeopleData());
      }).toThrow("usePeopleData must be used within PeopleDataProvider");
    });

    it("provides context when used with provider", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(result.current).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("has users array", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(Array.isArray(result.current.users)).toBe(true);
      expect(result.current.users.length).toBeGreaterThan(0);
    });

    it("has teams array", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(Array.isArray(result.current.teams)).toBe(true);
      expect(result.current.teams.length).toBeGreaterThan(0);
    });

    it("has orgPeople array", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(Array.isArray(result.current.orgPeople)).toBe(true);
    });

    it("has currentUser", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(result.current.currentUser).not.toBeNull();
      expect(result.current.currentUser?.id).toBeDefined();
      expect(result.current.currentUser?.label).toBeDefined();
    });

    it("has currentUserId", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(result.current.currentUserId).not.toBeNull();
    });

    it("has updatedAt timestamp", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(result.current.updatedAt).toBeDefined();
      expect(new Date(result.current.updatedAt).getTime()).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Derived Options
  // ═══════════════════════════════════════════════════════════════════════════

  describe("derived options", () => {
    it("provides teamOptions array", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(Array.isArray(result.current.teamOptions)).toBe(true);

      if (result.current.teamOptions.length > 0) {
        const option = result.current.teamOptions[0]!;
        expect(option).toHaveProperty("id");
        expect(option).toHaveProperty("label");
      }
    });

    it("provides teamNameOptions array", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(Array.isArray(result.current.teamNameOptions)).toBe(true);

      if (result.current.teamNameOptions.length > 0) {
        expect(typeof result.current.teamNameOptions[0]).toBe("string");
      }
    });

    it("provides ownerOptions array", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(Array.isArray(result.current.ownerOptions)).toBe(true);

      if (result.current.ownerOptions.length > 0) {
        const option = result.current.ownerOptions[0]!;
        expect(option).toHaveProperty("id");
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("initials");
      }
    });

    it("provides mentionPeople array", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(Array.isArray(result.current.mentionPeople)).toBe(true);
      // Should be same as ownerOptions
      expect(result.current.mentionPeople).toEqual(result.current.ownerOptions);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Users
  // ═══════════════════════════════════════════════════════════════════════════

  describe("users", () => {
    it("users have required fields", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const user = result.current.users[0];
      if (user) {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("firstName");
        expect(user).toHaveProperty("lastName");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("status");
        expect(user).toHaveProperty("teams");
        expect(Array.isArray(user.teams)).toBe(true);
      }
    });

    it("users are sorted by name", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const names = result.current.users.map((u) => `${u.firstName} ${u.lastName}`);
      const sorted = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));

      expect(names).toEqual(sorted);
    });

    it("setUsers is a no-op (users come from API)", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstUser = result.current.users[0];
      if (firstUser) {
        const originalFirstName = firstUser.firstName;

        act(() => {
          result.current.setUsers((prev) =>
            prev.map((u) =>
              u.id === firstUser.id ? { ...u, firstName: "UpdatedName" } : u
            )
          );
        });

        // setUsers is deprecated and no longer mutates the users list
        const updated = result.current.users.find((u) => u.id === firstUser.id);
        expect(updated?.firstName).toBe(originalFirstName);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Teams
  // ═══════════════════════════════════════════════════════════════════════════

  describe("teams", () => {
    it("teams have required fields", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const team = result.current.teams[0];
      if (team) {
        expect(team).toHaveProperty("id");
        expect(team).toHaveProperty("name");
        expect(team).toHaveProperty("status");
        expect(team).toHaveProperty("members");
        expect(Array.isArray(team.members)).toBe(true);
      }
    });

    it("teams are sorted by name", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const names = result.current.teams.map((t) => t.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));

      expect(names).toEqual(sorted);
    });

    it("setTeams allows updating teams", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstTeam = result.current.teams[0];
      if (firstTeam) {
        const originalName = firstTeam.name;

        act(() => {
          result.current.setTeams((prev) =>
            prev.map((t) =>
              t.id === firstTeam.id ? { ...t, name: "Updated Team Name" } : t
            )
          );
        });

        const updated = result.current.teams.find((t) => t.id === firstTeam.id);
        expect(updated?.name).toBe("Updated Team Name");
        expect(updated?.name).not.toBe(originalName);
      }
    });

    it("team members have user information", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const teamWithMembers = result.current.teams.find((t) => t.members && t.members.length > 0);
      if (teamWithMembers && teamWithMembers.members && teamWithMembers.members.length > 0) {
        const member = teamWithMembers.members[0]!;
        expect(member).toHaveProperty("userId");
        expect(member).toHaveProperty("teamId");
        expect(member).toHaveProperty("roleInTeam");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Org People
  // ═══════════════════════════════════════════════════════════════════════════

  describe("orgPeople", () => {
    it("orgPeople matches users count", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });
      expect(result.current.orgPeople.length).toBe(result.current.users.length);
    });

    it("orgPeople have required fields", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const person = result.current.orgPeople[0];
      if (person) {
        expect(person).toHaveProperty("id");
        expect(person).toHaveProperty("firstName");
        expect(person).toHaveProperty("lastName");
        expect(person).toHaveProperty("status");
        expect(person).toHaveProperty("teams");
      }
    });

    it("setOrgPeople allows updating", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstPerson = result.current.orgPeople[0];
      if (firstPerson) {
        act(() => {
          result.current.setOrgPeople((prev) =>
            prev.map((p) =>
              p.id === firstPerson.id ? { ...p, jobTitle: "New Job Title" } : p
            )
          );
        });

        const updated = result.current.orgPeople.find((p) => p.id === firstPerson.id);
        expect(updated?.jobTitle).toBe("New Job Title");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Current User
  // ═══════════════════════════════════════════════════════════════════════════

  describe("current user", () => {
    it("setCurrentUserId changes current user", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const anotherUser = result.current.users.find(
        (u) => u.id !== result.current.currentUserId && u.status === "active"
      );

      if (anotherUser) {
        const originalUserId = result.current.currentUserId;

        act(() => {
          result.current.setCurrentUserId(anotherUser.id);
        });

        expect(result.current.currentUserId).toBe(anotherUser.id);
        expect(result.current.currentUserId).not.toBe(originalUserId);
        expect(result.current.currentUser?.id).toBe(anotherUser.id);
      }
    });

    it("setCurrentUserId ignores invalid user ID", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const originalUserId = result.current.currentUserId;

      act(() => {
        result.current.setCurrentUserId("non-existent-user-id");
      });

      expect(result.current.currentUserId).toBe(originalUserId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ID Resolution
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ID resolution", () => {
    it("resolveUserId returns canonical ID", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstUser = result.current.users[0];
      if (firstUser) {
        const resolved = result.current.resolveUserId(firstUser.id);
        expect(resolved).toBe(firstUser.id);
      }
    });

    it("resolveUserId returns input for unknown ID", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const resolved = result.current.resolveUserId("unknown-id");
      expect(resolved).toBe("unknown-id");
    });

    it("resolveTeamId returns canonical ID", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstTeam = result.current.teams[0];
      if (firstTeam) {
        const resolved = result.current.resolveTeamId(firstTeam.id);
        expect(resolved).toBe(firstTeam.id);
      }
    });

    it("resolveTeamId returns input for unknown ID", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const resolved = result.current.resolveTeamId("unknown-id");
      expect(resolved).toBe("unknown-id");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Lookup Functions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("lookup functions", () => {
    it("getTeamNameById returns team name", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstTeam = result.current.teams[0];
      if (firstTeam) {
        const name = result.current.getTeamNameById(firstTeam.id);
        expect(name).toBe(firstTeam.name);
      }
    });

    it("getTeamNameById returns null for unknown ID", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const name = result.current.getTeamNameById("unknown-id");
      expect(name).toBeNull();
    });

    it("getTeamIdByName returns team ID", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstTeam = result.current.teams[0];
      if (firstTeam) {
        const id = result.current.getTeamIdByName(firstTeam.name);
        expect(id).toBe(firstTeam.id);
      }
    });

    it("getTeamIdByName returns null for unknown name", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const id = result.current.getTeamIdByName("Unknown Team Name");
      expect(id).toBeNull();
    });

    it("getTeamIdByName is case-insensitive", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstTeam = result.current.teams[0];
      if (firstTeam) {
        const upperCaseName = firstTeam.name.toUpperCase();
        const lowerCaseName = firstTeam.name.toLowerCase();

        const idUpper = result.current.getTeamIdByName(upperCaseName);
        const idLower = result.current.getTeamIdByName(lowerCaseName);

        expect(idUpper).toBe(firstTeam.id);
        expect(idLower).toBe(firstTeam.id);
      }
    });

    it("getUserDisplayName returns full name", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstUser = result.current.users[0];
      if (firstUser) {
        const name = result.current.getUserDisplayName(firstUser.id);
        expect(name).toBe(`${firstUser.firstName} ${firstUser.lastName}`);
      }
    });

    it("getUserDisplayName returns ID for unknown user", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const name = result.current.getUserDisplayName("unknown-id");
      expect(name).toBe("unknown-id");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Reset to Seed
  // ═══════════════════════════════════════════════════════════════════════════

  describe("resetToSeed", () => {
    it("resets all data to seed values", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const initialUserCount = result.current.users.length;

      act(() => {
        result.current.resetToSeed();
      });

      // After reset, users are still available (from seed or API fallback)
      expect(result.current.users.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.current.users)).toBe(true);
      // User count is preserved or comes from snapshot seed
      expect(result.current.users.length).toBe(initialUserCount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Integration: User-Team Relationship
  // ═══════════════════════════════════════════════════════════════════════════

  describe("user-team relationship", () => {
    it("users have teams array from team memberships", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const userWithTeams = result.current.users.find((u) => u.teams.length > 0);
      if (userWithTeams) {
        // User's teams should match team names
        expect(userWithTeams.teams.length).toBeGreaterThan(0);
        expect(typeof userWithTeams.teams[0]).toBe("string");
      }
    });

    it("team members reference valid users", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const teamWithMembers = result.current.teams.find(
        (t) => t.members && t.members.length > 0
      );

      if (teamWithMembers && teamWithMembers.members && teamWithMembers.members.length > 0) {
        const member = teamWithMembers.members[0]!;
        const user = result.current.users.find((u) => u.id === member.userId);
        expect(user).toBeDefined();
      }
    });

    it("setUsers team changes are no-ops (team membership comes from API)", () => {
      const { result } = renderHook(() => usePeopleData(), { wrapper });

      const firstTeam = result.current.teams[0];
      const userNotInTeam = result.current.users.find(
        (u) => !u.teams.includes(firstTeam?.name ?? "")
      );

      if (firstTeam && userNotInTeam) {
        const originalTeams = [...(userNotInTeam.teams ?? [])];

        act(() => {
          result.current.setUsers((prev) =>
            prev.map((u) =>
              u.id === userNotInTeam.id
                ? { ...u, teams: [...u.teams, firstTeam.name] }
                : u
            )
          );
        });

        // setUsers is a no-op; team membership should be unchanged
        const updatedUser = result.current.users.find((u) => u.id === userNotInTeam.id);
        expect(updatedUser?.teams).toEqual(originalTeams);
      }
    });
  });
});
