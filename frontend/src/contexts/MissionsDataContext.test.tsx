import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityDataProvider } from "./ActivityDataContext";
import { ConfigDataProvider } from "./ConfigDataContext";
import { MissionsDataProvider, useMissionsData } from "./MissionsDataContext";
import { MockAuthProvider } from "../../tests/setup/MockAuthProvider";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MockAuthProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigDataProvider>
          <ActivityDataProvider>
            <MissionsDataProvider>{children}</MissionsDataProvider>
          </ActivityDataProvider>
        </ConfigDataProvider>
      </QueryClientProvider>
    </MockAuthProvider>
  );
}

describe("MissionsDataContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  describe("initial state", () => {
    it("has missions array", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });
      expect(Array.isArray(result.current.missions)).toBe(true);
    });

    it("has isLoadingMissions flag", () => {
      const { result } = renderHook(() => useMissionsData(), { wrapper });
      expect(typeof result.current.isLoadingMissions).toBe("boolean");
    });

    it("missions starts empty when no auth token is configured", () => {
      // Without a real auth token the API queries stay disabled, so the
      // composed tree is empty. Real screens see a populated list once
      // useMissions/useIndicators/useTasks resolve.
      const { result } = renderHook(() => useMissionsData(), { wrapper });
      expect(result.current.missions).toEqual([]);
    });
  });
});
