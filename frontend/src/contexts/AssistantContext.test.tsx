/**
 * Tests for AssistantContext
 *
 * This context provides AI assistant panel state (open, toggle) via createContext
 * with defaults. No provider is required — the hook returns defaults when used
 * outside a provider.
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AssistantContext, useAssistant } from "./AssistantContext";

// ─── Tests ───

describe("AssistantContext", () => {
  describe("default values", () => {
    it("returns open as false by default", () => {
      const { result } = renderHook(() => useAssistant());
      expect(result.current.open).toBe(false);
    });

    it("returns toggle as a no-op function", () => {
      const { result } = renderHook(() => useAssistant());
      expect(typeof result.current.toggle).toBe("function");
      expect(() => result.current.toggle()).not.toThrow();
    });
  });

  describe("custom provider", () => {
    it("overrides defaults when provider supplies values", () => {
      const toggle = vi.fn();

      function wrapper({ children }: { children: ReactNode }) {
        return (
          <AssistantContext.Provider value={{ open: true, toggle }}>
            {children}
          </AssistantContext.Provider>
        );
      }

      const { result } = renderHook(() => useAssistant(), { wrapper });

      expect(result.current.open).toBe(true);
      result.current.toggle();
      expect(toggle).toHaveBeenCalledTimes(1);
    });
  });
});
