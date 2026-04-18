/**
 * SettingsDataContext — React context for AI and platform settings
 *
 * Follows the same patterns as ConfigDataContext, PeopleDataContext, etc.
 * Provides CRUD operations for AI settings, data sources, custom tones, and knowledge docs.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createDefaultAiSettings,
  generateId,
  loadSettingsSnapshot,
  resetSettingsSnapshot,
  saveSettingsSnapshot,
  TONE_PRESETS,
  DATA_SOURCE_CATALOG,
  type CustomToneRecord,
  type DataSourceRecord,
  type DataSourceType,
  type KnowledgeDocRecord,
  type KnowledgeDocType,
  type OrgAiSettings,
  type ProactivityLevel,
  type SettingsStoreSnapshot,
  type SuggestionTypes,
  type ToneId,
  type TonePreset,
  type TransparencyMode,
  type DataSourceCatalogItem,
  type LlmProviderRecord,
  type LlmProvider,
  LLM_PROVIDER_CATALOG,
  type LlmProviderCatalogItem,
} from "@/lib/settings-store";
import { useConfigData } from "@/contexts/ConfigDataContext";

// ─── Context Types ───

interface SettingsDataContextValue {
  // Current org
  activeOrgId: string;

  // AI Settings (Tab 1 & 2)
  aiSettings: OrgAiSettings;
  selectedTone: TonePreset | CustomToneRecord;
  allTones: (TonePreset | CustomToneRecord)[];

  // Tab 1: Assistente
  setToneId: (toneId: ToneId | string) => void;
  setLanguage: (language: string) => void;
  setRespectWorkingHours: (value: boolean) => void;
  setWorkingHours: (start: string, end: string) => void;

  // Tab 2: Sugestões
  setProactivityLevel: (level: ProactivityLevel) => void;
  setSuggestionType: (key: keyof SuggestionTypes, value: boolean) => void;
  setTransparencyMode: (mode: TransparencyMode) => void;

  // Tab 3: Fontes de dados
  dataSources: DataSourceRecord[];
  dataSourceCatalog: DataSourceCatalogItem[];
  availableDataSources: DataSourceCatalogItem[];
  connectDataSource: (input: {
    type: DataSourceType;
    name: string;
    description: string;
    url: string;
    tools?: string[];
  }) => DataSourceRecord;
  disconnectDataSource: (sourceId: string) => void;
  toggleDataSource: (sourceId: string) => void;
  updateDataSource: (sourceId: string, patch: Partial<DataSourceRecord>) => DataSourceRecord | null;
  syncDataSource: (sourceId: string) => void;

  // Tab 4: Avançado
  setCustomInstructions: (value: string) => void;
  setAiChannel: (channelId: string, enabled: boolean) => void;
  setBiasDetectionEnabled: (value: boolean) => void;
  setDataSharingEnabled: (value: boolean) => void;
  setMonthlyUsageLimit: (value: number | null) => void;

  // Custom tones
  customTones: CustomToneRecord[];
  createCustomTone: (input: { label: string; description: string; example: string }) => CustomToneRecord;
  updateCustomTone: (toneId: string, patch: Partial<CustomToneRecord>) => CustomToneRecord | null;
  deleteCustomTone: (toneId: string) => void;

  // Knowledge docs
  knowledgeDocs: KnowledgeDocRecord[];
  addKnowledgeDoc: (input: { name: string; type: KnowledgeDocType; size?: string; content?: string }) => KnowledgeDocRecord;
  removeKnowledgeDoc: (docId: string) => void;

  // LLM Providers
  llmProviders: LlmProviderRecord[];
  llmProviderCatalog: LlmProviderCatalogItem[];
  addLlmProvider: (input: { provider: LlmProvider; label: string; apiKey: string; model: string }) => LlmProviderRecord;
  updateLlmProvider: (providerId: string, patch: Partial<LlmProviderRecord>) => LlmProviderRecord | null;
  removeLlmProvider: (providerId: string) => void;
  toggleLlmProvider: (providerId: string) => void;

  // Utils
  resetToSeed: () => void;
  updatedAt: string;
}

const SettingsDataContext = createContext<SettingsDataContextValue | null>(null);

// ─── Provider ───

interface SettingsDataProviderProps {
  children: ReactNode;
}

export function SettingsDataProvider({ children }: SettingsDataProviderProps) {
  const { activeOrgId } = useConfigData();
  const [snapshot, setSnapshot] = useState<SettingsStoreSnapshot>(() => loadSettingsSnapshot());

  // Reload snapshot when org changes (consistent with other contexts)
  useEffect(() => {
    setSnapshot(loadSettingsSnapshot());
  }, [activeOrgId]);

  // ─── Derived State ───

  const aiSettings = useMemo(() => {
    return snapshot.aiSettingsByOrg[activeOrgId] ?? createDefaultAiSettings(activeOrgId);
  }, [snapshot.aiSettingsByOrg, activeOrgId]);

  const dataSources = useMemo(() => {
    return snapshot.dataSourcesByOrg[activeOrgId] ?? [];
  }, [snapshot.dataSourcesByOrg, activeOrgId]);

  const customTones = useMemo(() => {
    return snapshot.customTonesByOrg[activeOrgId] ?? [];
  }, [snapshot.customTonesByOrg, activeOrgId]);

  const knowledgeDocs = useMemo(() => {
    return snapshot.knowledgeDocsByOrg[activeOrgId] ?? [];
  }, [snapshot.knowledgeDocsByOrg, activeOrgId]);

  const llmProviders = useMemo(() => {
    return snapshot.llmProvidersByOrg[activeOrgId] ?? [];
  }, [snapshot.llmProvidersByOrg, activeOrgId]);

  const allTones = useMemo(() => {
    return [...TONE_PRESETS, ...customTones];
  }, [customTones]);

  const selectedTone = useMemo(() => {
    const systemTone = TONE_PRESETS.find((t) => t.id === aiSettings.toneId);
    if (systemTone) return systemTone;

    const customTone = customTones.find((t) => t.id === aiSettings.toneId);
    if (customTone) return customTone;

    return TONE_PRESETS[0]!;
  }, [aiSettings.toneId, customTones]);

  const availableDataSources = useMemo(() => {
    const connectedTypes = new Set(dataSources.map((ds) => ds.type));
    return DATA_SOURCE_CATALOG.filter((item) => !connectedTypes.has(item.type) || item.type === "custom");
  }, [dataSources]);

  // ─── Save Helper ───

  const persistSnapshot = useCallback((next: Omit<SettingsStoreSnapshot, "schemaVersion" | "updatedAt">) => {
    const saved = saveSettingsSnapshot(next);
    setSnapshot(saved);
  }, []);

  const updateAiSettings = useCallback((patch: Partial<OrgAiSettings>) => {
    const current = snapshot.aiSettingsByOrg[activeOrgId] ?? createDefaultAiSettings(activeOrgId);
    const updated: OrgAiSettings = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    persistSnapshot({
      ...snapshot,
      aiSettingsByOrg: {
        ...snapshot.aiSettingsByOrg,
        [activeOrgId]: updated,
      },
    });
  }, [snapshot, activeOrgId, persistSnapshot]);

  // ─── Tab 1: Assistente ───

  const setToneId = useCallback((toneId: ToneId | string) => {
    updateAiSettings({ toneId: toneId as ToneId });
  }, [updateAiSettings]);

  const setLanguage = useCallback((language: string) => {
    updateAiSettings({ language });
  }, [updateAiSettings]);

  const setRespectWorkingHours = useCallback((value: boolean) => {
    updateAiSettings({ respectWorkingHours: value });
  }, [updateAiSettings]);

  const setWorkingHours = useCallback((start: string, end: string) => {
    updateAiSettings({ workingHoursStart: start, workingHoursEnd: end });
  }, [updateAiSettings]);

  // ─── Tab 2: Sugestões ───

  const setProactivityLevel = useCallback((level: ProactivityLevel) => {
    updateAiSettings({ proactivityLevel: level });
  }, [updateAiSettings]);

  const setSuggestionType = useCallback((key: keyof SuggestionTypes, value: boolean) => {
    const current = snapshot.aiSettingsByOrg[activeOrgId] ?? createDefaultAiSettings(activeOrgId);
    updateAiSettings({
      suggestionTypes: {
        ...current.suggestionTypes,
        [key]: value,
      },
    });
  }, [snapshot.aiSettingsByOrg, activeOrgId, updateAiSettings]);

  const setTransparencyMode = useCallback((mode: TransparencyMode) => {
    updateAiSettings({ transparencyMode: mode });
  }, [updateAiSettings]);

  // ─── Tab 3: Fontes de dados ───

  const connectDataSource = useCallback((input: {
    type: DataSourceType;
    name: string;
    description: string;
    url: string;
    tools?: string[];
  }): DataSourceRecord => {
    const now = new Date().toISOString();
    const catalogItem = DATA_SOURCE_CATALOG.find((c) => c.type === input.type);

    const newSource: DataSourceRecord = {
      id: generateId("ds"),
      orgId: activeOrgId,
      type: input.type,
      name: input.name,
      description: input.description,
      status: "connected",
      enabled: true,
      url: input.url,
      lastSync: now,
      accessSummary: null,
      tools: input.tools ?? catalogItem?.tools ?? [],
      connectedAt: now,
      updatedAt: now,
    };

    const currentSources = snapshot.dataSourcesByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      dataSourcesByOrg: {
        ...snapshot.dataSourcesByOrg,
        [activeOrgId]: [...currentSources, newSource],
      },
    });

    return newSource;
  }, [snapshot, activeOrgId, persistSnapshot]);

  const disconnectDataSource = useCallback((sourceId: string) => {
    const currentSources = snapshot.dataSourcesByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      dataSourcesByOrg: {
        ...snapshot.dataSourcesByOrg,
        [activeOrgId]: currentSources.filter((s) => s.id !== sourceId),
      },
    });
  }, [snapshot, activeOrgId, persistSnapshot]);

  const toggleDataSource = useCallback((sourceId: string) => {
    const currentSources = snapshot.dataSourcesByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      dataSourcesByOrg: {
        ...snapshot.dataSourcesByOrg,
        [activeOrgId]: currentSources.map((s) =>
          s.id === sourceId ? { ...s, enabled: !s.enabled, updatedAt: new Date().toISOString() } : s
        ),
      },
    });
  }, [snapshot, activeOrgId, persistSnapshot]);

  const updateDataSource = useCallback((sourceId: string, patch: Partial<DataSourceRecord>): DataSourceRecord | null => {
    const currentSources = snapshot.dataSourcesByOrg[activeOrgId] ?? [];
    const source = currentSources.find((s) => s.id === sourceId);
    if (!source) return null;

    const updated: DataSourceRecord = {
      ...source,
      ...patch,
      id: source.id,
      orgId: source.orgId,
      updatedAt: new Date().toISOString(),
    };

    persistSnapshot({
      ...snapshot,
      dataSourcesByOrg: {
        ...snapshot.dataSourcesByOrg,
        [activeOrgId]: currentSources.map((s) => s.id === sourceId ? updated : s),
      },
    });

    return updated;
  }, [snapshot, activeOrgId, persistSnapshot]);

  const syncDataSource = useCallback((sourceId: string) => {
    updateDataSource(sourceId, {
      lastSync: new Date().toISOString(),
      status: "connected",
    });
  }, [updateDataSource]);

  // ─── Tab 4: Avançado ───

  const setCustomInstructions = useCallback((value: string) => {
    updateAiSettings({ customInstructions: value });
  }, [updateAiSettings]);

  const setAiChannel = useCallback((channelId: string, enabled: boolean) => {
    const current = aiSettings.aiChannels ?? { platform: true };
    updateAiSettings({ aiChannels: { ...current, [channelId]: enabled } });
  }, [updateAiSettings, aiSettings.aiChannels]);

  const setBiasDetectionEnabled = useCallback((value: boolean) => {
    updateAiSettings({ biasDetectionEnabled: value });
  }, [updateAiSettings]);

  const setDataSharingEnabled = useCallback((value: boolean) => {
    updateAiSettings({ dataSharingEnabled: value });
  }, [updateAiSettings]);

  const setMonthlyUsageLimit = useCallback((value: number | null) => {
    updateAiSettings({ monthlyUsageLimit: value });
  }, [updateAiSettings]);

  // ─── Custom Tones ───

  const createCustomTone = useCallback((input: { label: string; description: string; example: string }): CustomToneRecord => {
    const now = new Date().toISOString();
    const newTone: CustomToneRecord = {
      id: generateId("tone"),
      orgId: activeOrgId,
      label: input.label,
      description: input.description,
      example: input.example,
      createdAt: now,
      updatedAt: now,
    };

    const currentTones = snapshot.customTonesByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      customTonesByOrg: {
        ...snapshot.customTonesByOrg,
        [activeOrgId]: [...currentTones, newTone],
      },
    });

    return newTone;
  }, [snapshot, activeOrgId, persistSnapshot]);

  const updateCustomTone = useCallback((toneId: string, patch: Partial<CustomToneRecord>): CustomToneRecord | null => {
    const currentTones = snapshot.customTonesByOrg[activeOrgId] ?? [];
    const tone = currentTones.find((t) => t.id === toneId);
    if (!tone) return null;

    const updated: CustomToneRecord = {
      ...tone,
      ...patch,
      id: tone.id,
      orgId: tone.orgId,
      updatedAt: new Date().toISOString(),
    };

    persistSnapshot({
      ...snapshot,
      customTonesByOrg: {
        ...snapshot.customTonesByOrg,
        [activeOrgId]: currentTones.map((t) => t.id === toneId ? updated : t),
      },
    });

    return updated;
  }, [snapshot, activeOrgId, persistSnapshot]);

  const deleteCustomTone = useCallback((toneId: string) => {
    const currentTones = snapshot.customTonesByOrg[activeOrgId] ?? [];

    // If deleted tone was selected, reset to default
    const currentSettings = snapshot.aiSettingsByOrg[activeOrgId];
    if (currentSettings?.toneId === toneId) {
      updateAiSettings({ toneId: "profissional" });
    }

    persistSnapshot({
      ...snapshot,
      customTonesByOrg: {
        ...snapshot.customTonesByOrg,
        [activeOrgId]: currentTones.filter((t) => t.id !== toneId),
      },
    });
  }, [snapshot, activeOrgId, persistSnapshot, updateAiSettings]);

  // ─── Knowledge Docs ───

  const addKnowledgeDoc = useCallback((input: { name: string; type: KnowledgeDocType; size?: string; content?: string }): KnowledgeDocRecord => {
    const newDoc: KnowledgeDocRecord = {
      id: generateId("doc"),
      orgId: activeOrgId,
      name: input.name,
      type: input.type,
      size: input.size ?? null,
      content: input.content ?? null,
      addedAt: new Date().toISOString().split("T")[0]!,
    };

    const currentDocs = snapshot.knowledgeDocsByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      knowledgeDocsByOrg: {
        ...snapshot.knowledgeDocsByOrg,
        [activeOrgId]: [...currentDocs, newDoc],
      },
    });

    return newDoc;
  }, [snapshot, activeOrgId, persistSnapshot]);

  const removeKnowledgeDoc = useCallback((docId: string) => {
    const currentDocs = snapshot.knowledgeDocsByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      knowledgeDocsByOrg: {
        ...snapshot.knowledgeDocsByOrg,
        [activeOrgId]: currentDocs.filter((d) => d.id !== docId),
      },
    });
  }, [snapshot, activeOrgId, persistSnapshot]);

  // ─── LLM Providers ───

  const addLlmProvider = useCallback((input: { provider: LlmProvider; label: string; apiKey: string; model: string }): LlmProviderRecord => {
    const now = new Date().toISOString();
    const record: LlmProviderRecord = {
      id: generateId("llm"),
      orgId: activeOrgId,
      provider: input.provider,
      label: input.label,
      apiKey: input.apiKey,
      model: input.model,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    const current = snapshot.llmProvidersByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      llmProvidersByOrg: {
        ...snapshot.llmProvidersByOrg,
        [activeOrgId]: [...current, record],
      },
    });
    return record;
  }, [snapshot, activeOrgId, persistSnapshot]);

  const updateLlmProvider = useCallback((providerId: string, patch: Partial<LlmProviderRecord>): LlmProviderRecord | null => {
    const current = snapshot.llmProvidersByOrg[activeOrgId] ?? [];
    const idx = current.findIndex((p) => p.id === providerId);
    if (idx === -1) return null;
    const updated = { ...current[idx]!, ...patch, updatedAt: new Date().toISOString() };
    persistSnapshot({
      ...snapshot,
      llmProvidersByOrg: {
        ...snapshot.llmProvidersByOrg,
        [activeOrgId]: current.map((p) => p.id === providerId ? updated : p),
      },
    });
    return updated;
  }, [snapshot, activeOrgId, persistSnapshot]);

  const removeLlmProvider = useCallback((providerId: string) => {
    const current = snapshot.llmProvidersByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      llmProvidersByOrg: {
        ...snapshot.llmProvidersByOrg,
        [activeOrgId]: current.filter((p) => p.id !== providerId),
      },
    });
  }, [snapshot, activeOrgId, persistSnapshot]);

  const toggleLlmProvider = useCallback((providerId: string) => {
    const current = snapshot.llmProvidersByOrg[activeOrgId] ?? [];
    persistSnapshot({
      ...snapshot,
      llmProvidersByOrg: {
        ...snapshot.llmProvidersByOrg,
        [activeOrgId]: current.map((p) => p.id === providerId ? { ...p, enabled: !p.enabled, updatedAt: new Date().toISOString() } : p),
      },
    });
  }, [snapshot, activeOrgId, persistSnapshot]);

  // ─── Reset ───

  const resetToSeed = useCallback(() => {
    const seed = resetSettingsSnapshot();
    setSnapshot(seed);
  }, []);

  // ─── Context Value ───

  const value: SettingsDataContextValue = useMemo(() => ({
    activeOrgId,
    aiSettings,
    selectedTone,
    allTones,
    setToneId,
    setLanguage,
    setRespectWorkingHours,
    setWorkingHours,
    setProactivityLevel,
    setSuggestionType,
    setTransparencyMode,
    dataSources,
    dataSourceCatalog: DATA_SOURCE_CATALOG,
    availableDataSources,
    connectDataSource,
    disconnectDataSource,
    toggleDataSource,
    updateDataSource,
    syncDataSource,
    setCustomInstructions,
    setAiChannel,
    setBiasDetectionEnabled,
    setDataSharingEnabled,
    setMonthlyUsageLimit,
    customTones,
    createCustomTone,
    updateCustomTone,
    deleteCustomTone,
    knowledgeDocs,
    addKnowledgeDoc,
    removeKnowledgeDoc,
    llmProviders,
    llmProviderCatalog: LLM_PROVIDER_CATALOG,
    addLlmProvider,
    updateLlmProvider,
    removeLlmProvider,
    toggleLlmProvider,
    resetToSeed,
    updatedAt: snapshot.updatedAt,
  }), [
    activeOrgId,
    aiSettings,
    selectedTone,
    allTones,
    setToneId,
    setLanguage,
    setRespectWorkingHours,
    setWorkingHours,
    setProactivityLevel,
    setSuggestionType,
    setTransparencyMode,
    dataSources,
    availableDataSources,
    connectDataSource,
    disconnectDataSource,
    toggleDataSource,
    updateDataSource,
    syncDataSource,
    setCustomInstructions,
    setAiChannel,
    setBiasDetectionEnabled,
    setDataSharingEnabled,
    setMonthlyUsageLimit,
    customTones,
    createCustomTone,
    updateCustomTone,
    deleteCustomTone,
    knowledgeDocs,
    addKnowledgeDoc,
    removeKnowledgeDoc,
    llmProviders,
    addLlmProvider,
    updateLlmProvider,
    removeLlmProvider,
    toggleLlmProvider,
    resetToSeed,
    snapshot.updatedAt,
  ]);

  return (
    <SettingsDataContext.Provider value={value}>
      {children}
    </SettingsDataContext.Provider>
  );
}

// ─── Hook ───

export function useSettingsData(): SettingsDataContextValue {
  const context = useContext(SettingsDataContext);
  if (!context) {
    throw new Error("useSettingsData must be used within a SettingsDataProvider");
  }
  return context;
}
