import { type ReactNode } from "react";
import { vi } from "vitest";
import { AuthContext } from "@/contexts/AuthContext";

/**
 * Provides a pre-authenticated AuthContext for tests.
 * Components that call useAuth() will get mock values.
 * Mock functions are created fresh per render to avoid cross-test leakage.
 */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        initializing: false,
        user: null,
        activeOrganization: null,
        organizations: [],
        login: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn(),
        getToken: vi.fn().mockReturnValue(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
