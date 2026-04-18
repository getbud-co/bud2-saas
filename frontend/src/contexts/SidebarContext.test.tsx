/**
 * Tests for SidebarContext
 *
 * This context provides sidebar state (isMobile, openSidebar) via createContext
 * with defaults. No provider is required — the hook returns defaults when used
 * outside a provider.
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SidebarContext, useSidebar } from "./SidebarContext";

// ─── Tests ───

describe("SidebarContext", () => {
  describe("default values", () => {
    it("returns isMobile as false by default", () => {
      const { result } = renderHook(() => useSidebar());
      expect(result.current.isMobile).toBe(false);
    });

    it("returns openSidebar as a no-op function", () => {
      const { result } = renderHook(() => useSidebar());
      expect(typeof result.current.openSidebar).toBe("function");
      // Should not throw when called
      expect(() => result.current.openSidebar()).not.toThrow();
    });
  });

  describe("custom provider", () => {
    it("overrides defaults when provider supplies values", () => {
      const openSidebar = vi.fn();

      function wrapper({ children }: { children: ReactNode }) {
        return (
          <SidebarContext.Provider value={{ isMobile: true, openSidebar }}>
            {children}
          </SidebarContext.Provider>
        );
      }

      const { result } = renderHook(() => useSidebar(), { wrapper });

      expect(result.current.isMobile).toBe(true);
      result.current.openSidebar();
      expect(openSidebar).toHaveBeenCalledTimes(1);
    });
  });
});
