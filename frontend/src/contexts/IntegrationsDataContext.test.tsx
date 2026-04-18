/**
 * Tests for IntegrationsDataContext
 *
 * This context manages third-party integrations (Slack, Teams, etc.)
 * with connect/disconnect/sync/toggle operations. Depends on ConfigDataContext
 * for activeOrgId.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConfigDataProvider } from "./ConfigDataContext";
import { IntegrationsDataProvider, useIntegrationsData } from "./IntegrationsDataContext";

// ─── Test Helpers ───

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ConfigDataProvider>
      <IntegrationsDataProvider>{children}</IntegrationsDataProvider>
    </ConfigDataProvider>
  );
}

// ─── Tests ───

describe("IntegrationsDataContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("context setup", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useIntegrationsData());
      }).toThrow("useIntegrationsData must be used within IntegrationsDataProvider");
    });

    it("provides context when used with provider", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });
      expect(result.current).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("has integrations array", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });
      expect(Array.isArray(result.current.integrations)).toBe(true);
      expect(result.current.integrations.length).toBeGreaterThan(0);
    });

    it("has connectedIntegrations derived array", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });
      expect(Array.isArray(result.current.connectedIntegrations)).toBe(true);
      // All connected should have status "connected"
      result.current.connectedIntegrations.forEach((i) => {
        expect(i.status).toBe("connected");
      });
    });

    it("has disconnectedIntegrations derived array", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });
      expect(Array.isArray(result.current.disconnectedIntegrations)).toBe(true);
      result.current.disconnectedIntegrations.forEach((i) => {
        expect(i.status).not.toBe("connected");
      });
    });

    it("connected + disconnected covers all integrations", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });
      expect(
        result.current.connectedIntegrations.length + result.current.disconnectedIntegrations.length,
      ).toBe(result.current.integrations.length);
    });

    it("has updatedAt timestamp", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });
      expect(result.current.updatedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getIntegrationById
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getIntegrationById", () => {
    it("returns integration for valid id", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      const first = result.current.integrations[0]!;
      const found = result.current.getIntegrationById(first.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(first.id);
    });

    it("returns null for non-existent id", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });
      const found = result.current.getIntegrationById("non-existent");
      expect(found).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Connect / Disconnect
  // ═══════════════════════════════════════════════════════════════════════════

  describe("connectIntegration", () => {
    it("connects a disconnected integration", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      const disconnected = result.current.disconnectedIntegrations[0];
      if (!disconnected) return; // Skip if all are connected

      act(() => {
        result.current.connectIntegration(disconnected.id);
      });

      const updated = result.current.getIntegrationById(disconnected.id);
      expect(updated?.status).toBe("connected");
      expect(updated?.enabled).toBe(true);
      expect(updated?.connectedAt).toBeDefined();
    });

    it("connects with custom config", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      const disconnected = result.current.disconnectedIntegrations[0];
      if (!disconnected) return;

      act(() => {
        result.current.connectIntegration(disconnected.id, { channel: "#general" });
      });

      const updated = result.current.getIntegrationById(disconnected.id);
      expect(updated?.config).toEqual({ channel: "#general" });
    });
  });

  describe("disconnectIntegration", () => {
    it("disconnects a connected integration", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      const connected = result.current.connectedIntegrations[0];
      if (!connected) return;

      act(() => {
        result.current.disconnectIntegration(connected.id);
      });

      const updated = result.current.getIntegrationById(connected.id);
      expect(updated?.status).toBe("disconnected");
      expect(updated?.enabled).toBe(false);
      expect(updated?.connectedAt).toBeNull();
      expect(updated?.config).toEqual({});
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Toggle Enabled
  // ═══════════════════════════════════════════════════════════════════════════

  describe("toggleIntegrationEnabled", () => {
    it("toggles enabled state", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      const integration = result.current.integrations[0]!;
      const originalEnabled = integration.enabled;

      act(() => {
        result.current.toggleIntegrationEnabled(integration.id);
      });

      const updated = result.current.getIntegrationById(integration.id);
      expect(updated?.enabled).toBe(!originalEnabled);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Update Config
  // ═══════════════════════════════════════════════════════════════════════════

  describe("updateIntegrationConfig", () => {
    it("merges config values", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      const integration = result.current.integrations[0]!;

      act(() => {
        result.current.updateIntegrationConfig(integration.id, { newKey: "newValue" });
      });

      const updated = result.current.getIntegrationById(integration.id);
      expect(updated?.config).toHaveProperty("newKey", "newValue");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sync
  // ═══════════════════════════════════════════════════════════════════════════

  describe("syncIntegration", () => {
    it("updates lastSync timestamp", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      const integration = result.current.integrations[0]!;

      act(() => {
        result.current.syncIntegration(integration.id);
      });

      const updated = result.current.getIntegrationById(integration.id);
      expect(updated?.lastSync).toBeDefined();
      expect(new Date(updated!.lastSync!).getTime()).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Non-existent ID handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe("non-existent ID handling", () => {
    it("ignores operations on non-existent IDs", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      const countBefore = result.current.integrations.length;

      act(() => {
        result.current.connectIntegration("fake-id");
        result.current.disconnectIntegration("fake-id");
        result.current.toggleIntegrationEnabled("fake-id");
        result.current.syncIntegration("fake-id");
        result.current.updateIntegrationConfig("fake-id", { key: "val" });
      });

      expect(result.current.integrations.length).toBe(countBefore);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Reset to Seed
  // ═══════════════════════════════════════════════════════════════════════════

  describe("resetToSeed", () => {
    it("resets integrations to seed data", () => {
      const { result } = renderHook(() => useIntegrationsData(), { wrapper });

      // Make some changes
      const first = result.current.integrations[0]!;
      act(() => {
        result.current.updateIntegrationConfig(first.id, { custom: true });
      });

      act(() => {
        result.current.resetToSeed();
      });

      // Custom config should be gone
      const reset = result.current.getIntegrationById(first.id);
      expect(reset?.config).not.toHaveProperty("custom");
    });
  });
});
