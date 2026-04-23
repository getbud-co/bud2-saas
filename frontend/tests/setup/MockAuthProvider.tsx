import { type ReactNode } from "react";
import { vi } from "vitest";
import { AuthContext } from "@/contexts/AuthContext";

/**
 * Provides a pre-authenticated AuthContext for tests.
 * Components that call useAuth() will get mock values.
 * Mock functions are created fresh per render to avoid cross-test leakage.
 */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  const testToken = localStorage.getItem("bud.test.access-token");
  const parsedOrganizations = JSON.parse(
    localStorage.getItem("bud.test.organizations") ?? "[]",
  ) as Array<{
    id: string;
    name: string;
    domain?: string;
    workspace?: string;
    status?: string;
    membership_role?: string;
    membership_status?: string;
  }>;
  const testOrganizations = parsedOrganizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    domain: organization.domain ?? `${organization.id}.example.com`,
    workspace: organization.workspace ?? organization.id,
    status: organization.status ?? "active",
    membership_role: organization.membership_role ?? "super-admin",
    membership_status: organization.membership_status ?? "active",
  }));
  const activeOrganization = testOrganizations[0] ?? null;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        initializing: false,
        user: null,
        activeOrganization,
        organizations: testOrganizations,
        login: vi.fn().mockResolvedValue(undefined),
        switchOrganization: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn(),
        getToken: vi.fn().mockReturnValue(testToken),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
