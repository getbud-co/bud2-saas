/**
 * Tests for SettingsDataContext
 *
 * This context manages AI settings, data sources, custom tones,
 * knowledge docs, and LLM providers. Depends on ConfigDataContext.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConfigDataProvider } from "./ConfigDataContext";
import { SettingsDataProvider, useSettingsData } from "./SettingsDataContext";

// ─── Test Helpers ───

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ConfigDataProvider>
      <SettingsDataProvider>{children}</SettingsDataProvider>
    </ConfigDataProvider>
  );
}

// ─── Tests ───

describe("SettingsDataContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("context setup", () => {
    it("throws when used outside provider", () => {
      expect(() => {
        renderHook(() => useSettingsData());
      }).toThrow("useSettingsData must be used within a SettingsDataProvider");
    });

    it("provides context when used with provider", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(result.current).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Initial State
  // ═══════════════════════════════════════════════════════════════════════════

  describe("initial state", () => {
    it("has activeOrgId", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(result.current.activeOrgId).toBe("org-1");
    });

    it("has aiSettings object", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(result.current.aiSettings).toBeDefined();
      expect(result.current.aiSettings.toneId).toBeDefined();
      expect(result.current.aiSettings.language).toBeDefined();
    });

    it("has selectedTone", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(result.current.selectedTone).toBeDefined();
      expect(result.current.selectedTone.label).toBeDefined();
    });

    it("has allTones array with presets", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(result.current.allTones.length).toBeGreaterThan(0);
    });

    it("has updatedAt timestamp", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(result.current.updatedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 1: Assistente
  // ═══════════════════════════════════════════════════════════════════════════

  describe("assistente settings", () => {
    it("sets tone", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setToneId("casual");
      });

      expect(result.current.aiSettings.toneId).toBe("casual");
    });

    it("sets language", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setLanguage("en");
      });

      expect(result.current.aiSettings.language).toBe("en");
    });

    it("sets respectWorkingHours", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      const original = result.current.aiSettings.respectWorkingHours;

      act(() => {
        result.current.setRespectWorkingHours(!original);
      });

      expect(result.current.aiSettings.respectWorkingHours).toBe(!original);
    });

    it("sets working hours range", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setWorkingHours("08:00", "17:00");
      });

      expect(result.current.aiSettings.workingHoursStart).toBe("08:00");
      expect(result.current.aiSettings.workingHoursEnd).toBe("17:00");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 2: Sugestoes
  // ═══════════════════════════════════════════════════════════════════════════

  describe("suggestion settings", () => {
    it("sets proactivity level", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setProactivityLevel("high");
      });

      expect(result.current.aiSettings.proactivityLevel).toBe("high");
    });

    it("toggles suggestion type", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      const original = result.current.aiSettings.suggestionTypes.checkinReminders;

      act(() => {
        result.current.setSuggestionType("checkinReminders", !original);
      });

      expect(result.current.aiSettings.suggestionTypes.checkinReminders).toBe(!original);
    });

    it("sets transparency mode", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setTransparencyMode("verbose");
      });

      expect(result.current.aiSettings.transparencyMode).toBe("verbose");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 3: Fontes de dados
  // ═══════════════════════════════════════════════════════════════════════════

  describe("data sources", () => {
    it("has dataSources array", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(Array.isArray(result.current.dataSources)).toBe(true);
    });

    it("has dataSourceCatalog", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(result.current.dataSourceCatalog.length).toBeGreaterThan(0);
    });

    it("has availableDataSources (filtered by connected)", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(Array.isArray(result.current.availableDataSources)).toBe(true);
    });

    it("connects a data source", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      const initialCount = result.current.dataSources.length;

      let newSource: ReturnType<typeof result.current.connectDataSource>;
      act(() => {
        newSource = result.current.connectDataSource({
          type: "custom",
          name: "Custom API",
          description: "Test API",
          url: "https://api.test.com",
        });
      });

      expect(result.current.dataSources.length).toBe(initialCount + 1);
      expect(newSource!.name).toBe("Custom API");
      expect(newSource!.status).toBe("connected");
      expect(newSource!.enabled).toBe(true);
    });

    it("disconnects a data source", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let sourceId: string;
      act(() => {
        const src = result.current.connectDataSource({
          type: "custom",
          name: "To Remove",
          description: "desc",
          url: "https://test.com",
        });
        sourceId = src.id;
      });

      const countBefore = result.current.dataSources.length;

      act(() => {
        result.current.disconnectDataSource(sourceId!);
      });

      expect(result.current.dataSources.length).toBe(countBefore - 1);
    });

    it("toggles data source enabled", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let sourceId: string;
      act(() => {
        const src = result.current.connectDataSource({
          type: "custom",
          name: "Toggle Me",
          description: "desc",
          url: "https://test.com",
        });
        sourceId = src.id;
      });

      act(() => {
        result.current.toggleDataSource(sourceId!);
      });

      const toggled = result.current.dataSources.find((s) => s.id === sourceId);
      expect(toggled?.enabled).toBe(false);
    });

    it("syncs a data source", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let sourceId: string;
      act(() => {
        const src = result.current.connectDataSource({
          type: "custom",
          name: "Sync Me",
          description: "desc",
          url: "https://test.com",
        });
        sourceId = src.id;
      });

      act(() => {
        result.current.syncDataSource(sourceId!);
      });

      const synced = result.current.dataSources.find((s) => s.id === sourceId);
      expect(synced?.lastSync).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 4: Avancado
  // ═══════════════════════════════════════════════════════════════════════════

  describe("advanced settings", () => {
    it("sets custom instructions", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setCustomInstructions("Always respond in Portuguese");
      });

      expect(result.current.aiSettings.customInstructions).toBe("Always respond in Portuguese");
    });

    it("sets AI channel", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setAiChannel("slack", true);
      });

      expect(result.current.aiSettings.aiChannels?.slack).toBe(true);
    });

    it("sets bias detection", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setBiasDetectionEnabled(true);
      });

      expect(result.current.aiSettings.biasDetectionEnabled).toBe(true);
    });

    it("sets data sharing", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setDataSharingEnabled(false);
      });

      expect(result.current.aiSettings.dataSharingEnabled).toBe(false);
    });

    it("sets monthly usage limit", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setMonthlyUsageLimit(1000);
      });

      expect(result.current.aiSettings.monthlyUsageLimit).toBe(1000);
    });

    it("clears monthly usage limit", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.setMonthlyUsageLimit(null);
      });

      expect(result.current.aiSettings.monthlyUsageLimit).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Custom Tones
  // ═══════════════════════════════════════════════════════════════════════════

  describe("custom tones CRUD", () => {
    it("creates a custom tone", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      const initialCount = result.current.customTones.length;

      let tone: ReturnType<typeof result.current.createCustomTone>;
      act(() => {
        tone = result.current.createCustomTone({
          label: "Ultra Formal",
          description: "Very formal tone",
          example: "Dear Sir/Madam...",
        });
      });

      expect(result.current.customTones.length).toBe(initialCount + 1);
      expect(tone!.label).toBe("Ultra Formal");
      expect(tone!.id).toBeDefined();
    });

    it("custom tone appears in allTones", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      act(() => {
        result.current.createCustomTone({
          label: "My Tone",
          description: "desc",
          example: "example",
        });
      });

      const found = result.current.allTones.find((t) => t.label === "My Tone");
      expect(found).toBeDefined();
    });

    it("updates a custom tone", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let toneId: string;
      act(() => {
        const tone = result.current.createCustomTone({
          label: "Original",
          description: "desc",
          example: "example",
        });
        toneId = tone.id;
      });

      act(() => {
        result.current.updateCustomTone(toneId!, { label: "Updated" });
      });

      const updated = result.current.customTones.find((t) => t.id === toneId);
      expect(updated?.label).toBe("Updated");
    });

    it("deletes a custom tone", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let toneId: string;
      act(() => {
        const tone = result.current.createCustomTone({
          label: "To Delete",
          description: "desc",
          example: "example",
        });
        toneId = tone.id;
      });

      const countBefore = result.current.customTones.length;

      act(() => {
        result.current.deleteCustomTone(toneId!);
      });

      expect(result.current.customTones.length).toBe(countBefore - 1);
    });

    it("selectedTone falls back to default when selected custom tone is deleted", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let toneId: string;
      act(() => {
        const tone = result.current.createCustomTone({
          label: "Selected Tone",
          description: "desc",
          example: "example",
        });
        toneId = tone.id;
      });

      // Select the custom tone
      act(() => {
        result.current.setToneId(toneId!);
      });

      // Delete it
      act(() => {
        result.current.deleteCustomTone(toneId!);
      });

      // selectedTone should fall back to the first preset since the custom tone is gone
      expect(result.current.customTones.find((t) => t.id === toneId)).toBeUndefined();
      expect(result.current.selectedTone).toBeDefined();
      expect(result.current.selectedTone.label).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Knowledge Docs
  // ═══════════════════════════════════════════════════════════════════════════

  describe("knowledge docs", () => {
    it("adds a knowledge doc", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      const initialCount = result.current.knowledgeDocs.length;

      let doc: ReturnType<typeof result.current.addKnowledgeDoc>;
      act(() => {
        doc = result.current.addKnowledgeDoc({
          name: "Company Guide.pdf",
          type: "pdf",
          size: "2.4 MB",
        });
      });

      expect(result.current.knowledgeDocs.length).toBe(initialCount + 1);
      expect(doc!.name).toBe("Company Guide.pdf");
      expect(doc!.type).toBe("pdf");
    });

    it("removes a knowledge doc", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let docId: string;
      act(() => {
        const doc = result.current.addKnowledgeDoc({
          name: "To Remove.pdf",
          type: "pdf",
        });
        docId = doc.id;
      });

      const countBefore = result.current.knowledgeDocs.length;

      act(() => {
        result.current.removeKnowledgeDoc(docId!);
      });

      expect(result.current.knowledgeDocs.length).toBe(countBefore - 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LLM Providers
  // ═══════════════════════════════════════════════════════════════════════════

  describe("LLM providers", () => {
    it("has llmProviderCatalog", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });
      expect(result.current.llmProviderCatalog.length).toBeGreaterThan(0);
    });

    it("adds a provider", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      const initialCount = result.current.llmProviders.length;

      let provider: ReturnType<typeof result.current.addLlmProvider>;
      act(() => {
        provider = result.current.addLlmProvider({
          provider: "openai",
          label: "OpenAI GPT-4",
          apiKey: "sk-test-key",
          model: "gpt-4",
        });
      });

      expect(result.current.llmProviders.length).toBe(initialCount + 1);
      expect(provider!.provider).toBe("openai");
      expect(provider!.enabled).toBe(true);
    });

    it("updates a provider", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let providerId: string;
      act(() => {
        const p = result.current.addLlmProvider({
          provider: "openai",
          label: "Original",
          apiKey: "sk-test",
          model: "gpt-4",
        });
        providerId = p.id;
      });

      act(() => {
        result.current.updateLlmProvider(providerId!, { label: "Updated" });
      });

      const updated = result.current.llmProviders.find((p) => p.id === providerId);
      expect(updated?.label).toBe("Updated");
    });

    it("removes a provider", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let providerId: string;
      act(() => {
        const p = result.current.addLlmProvider({
          provider: "openai",
          label: "To Remove",
          apiKey: "sk-test",
          model: "gpt-4",
        });
        providerId = p.id;
      });

      const countBefore = result.current.llmProviders.length;

      act(() => {
        result.current.removeLlmProvider(providerId!);
      });

      expect(result.current.llmProviders.length).toBe(countBefore - 1);
    });

    it("toggles provider enabled state", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      let providerId: string;
      act(() => {
        const p = result.current.addLlmProvider({
          provider: "openai",
          label: "Toggle Me",
          apiKey: "sk-test",
          model: "gpt-4",
        });
        providerId = p.id;
      });

      // Initially enabled
      expect(result.current.llmProviders.find((p) => p.id === providerId)?.enabled).toBe(true);

      act(() => {
        result.current.toggleLlmProvider(providerId!);
      });

      expect(result.current.llmProviders.find((p) => p.id === providerId)?.enabled).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Reset to Seed
  // ═══════════════════════════════════════════════════════════════════════════

  describe("resetToSeed", () => {
    it("resets all settings to seed data", () => {
      const { result } = renderHook(() => useSettingsData(), { wrapper });

      // Make changes
      act(() => {
        result.current.setLanguage("en");
        result.current.createCustomTone({
          label: "Custom",
          description: "desc",
          example: "ex",
        });
      });

      act(() => {
        result.current.resetToSeed();
      });

      expect(result.current.customTones.find((t) => t.label === "Custom")).toBeUndefined();
    });
  });
});
