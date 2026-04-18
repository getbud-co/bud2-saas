import { useState, useRef, useMemo } from "react";
import {
  Card,
  Button,
  Input,
  Textarea,
  Toggle,
  Badge,
  Alert,
  TabBar,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Popover,
  Select,
  toast,
} from "@getbud-co/buds";
import type { PopoverItem } from "@getbud-co/buds";
import {
  Plus,
  Trash,
  FloppyDisk,
  Plugs,
  CheckCircle,
  ArrowsClockwise,
  Gear,
  DotsThreeVertical,
  Upload,
  File,
  X,
  Robot,
  Brain,
  ChatCircle,
  Handshake,
  Target,
  Lightning,
  PencilSimple,
  SlidersHorizontal,
  Clock,
  Eye,
  Lock,
  Calendar,
  Lightbulb,
  Warning,
  PencilLine,
  Crosshair,
  Newspaper,
  Database,
  FileText,
  ArrowSquareOut,
  SlackLogo,
  MicrosoftTeamsLogo,
  WhatsappLogo,
  Envelope,
  Globe,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useSettingsData } from "@/contexts/SettingsDataContext";
import { useIntegrationsData } from "@/contexts/IntegrationsDataContext";
import { TONE_PRESETS, type ProactivityLevel, type DataSourceType } from "@/lib/settings-store";
import styles from "./AiModule.module.css";

/* ——— Constants ——— */

const TABS = [
  { value: "assistant", label: "Assistente" },
  { value: "suggestions", label: "Sugestões" },
  { value: "sources", label: "Fontes de dados" },
  { value: "advanced", label: "Avançado" },
];

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const PROACTIVITY_LABELS: Record<ProactivityLevel, { label: string; description: string }> = {
  minimum: { label: "Mínimo", description: "Só quando solicitado" },
  moderate: { label: "Moderado", description: "Equilibrado" },
  default: { label: "Padrão", description: "Recomendado" },
  maximum: { label: "Máximo", description: "Sempre sugerindo" },
};

const USAGE_LIMIT_OPTIONS = [
  { value: "unlimited", label: "Ilimitado" },
  { value: "1000", label: "1.000 sugestões/mês" },
  { value: "5000", label: "5.000 sugestões/mês" },
  { value: "10000", label: "10.000 sugestões/mês" },
  { value: "50000", label: "50.000 sugestões/mês" },
];

const TONE_ICONS: Record<string, Icon> = {
  Handshake,
  Target,
  ChatCircle,
  Brain,
  Lightning,
  SlidersHorizontal,
};

const DATA_SOURCE_ICONS: Record<DataSourceType, Icon> = {
  notion: FileText,
  confluence: Database,
  gdrive: Database,
  sharepoint: Database,
  jira: Database,
  sheets: Database,
  custom: Plugs,
};

/* ——— Component ——— */

export function AiModule() {
  const [activeTab, setActiveTab] = useState("assistant");
  const settings = useSettingsData();
  const integrations = useIntegrationsData();
  const navigate = useNavigate();

  // ─── Local UI state ───
  const [toneModalOpen, setToneModalOpen] = useState(false);
  const editingTone = null as { id: string; label: string; description: string; example: string } | null;
  const [toneFormName, setToneFormName] = useState("");
  const [toneFormDesc, setToneFormDesc] = useState("");
  const [toneFormExample, setToneFormExample] = useState("");
  const [deleteTone, setDeleteTone] = useState<{ id: string; label: string } | null>(null);
  const [confirmSave, setConfirmSave] = useState<string | null>(null);

  const [connectSourceModal, setConnectSourceModal] = useState<{ type: DataSourceType; name: string; description: string; tools: string[] } | null>(null);
  const [sourceFormName, setSourceFormName] = useState("");
  const [sourceFormUrl, setSourceFormUrl] = useState("");
  const [configureSource, setConfigureSource] = useState<string | null>(null);
  const [sourcePopoverId, setSourcePopoverId] = useState<string | null>(null);
  const sourcePopoverRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [addDocType, setAddDocType] = useState<"file" | "text" | null>(null);
  const [docName, setDocName] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // ─── Derived data ───
  const activeTone = useMemo(() => {
    const systemTone = TONE_PRESETS.find((t) => t.id === settings.aiSettings.toneId);
    if (systemTone) return { ...systemTone, isCustom: false };

    const customTone = settings.customTones.find((t) => t.id === settings.aiSettings.toneId);
    if (customTone) return { ...customTone, iconName: "SlidersHorizontal", isCustom: true };

    return { ...TONE_PRESETS[0]!, isCustom: false };
  }, [settings.aiSettings.toneId, settings.customTones]);

  const usageLimitValue = useMemo(() => {
    const limit = settings.aiSettings.monthlyUsageLimit;
    if (limit === null) return "unlimited";
    return String(limit);
  }, [settings.aiSettings.monthlyUsageLimit]);

  /* ——— Handlers: Tab 1 - Assistente ——— */

  function handleSelectTone(toneId: string) {
    settings.setToneId(toneId);
  }

  function handleSaveAssistant() {
    toast.success("Configurações do assistente salvas");
  }

  /* ——— Handlers: Tab 2 - Sugestões ——— */

  function handleProactivityChange(level: ProactivityLevel) {
    settings.setProactivityLevel(level);
  }

  function handleSaveSuggestions() {
    toast.success("Preferências de sugestões salvas");
  }

  /* ——— Handlers: Tab 3 - Fontes de dados ——— */

  function openConnectSource(item: { type: DataSourceType; name: string; description: string; tools: string[] }) {
    setConnectSourceModal(item);
    setSourceFormName(item.name);
    setSourceFormUrl("");
  }

  function handleConnectSource() {
    if (!connectSourceModal || !sourceFormUrl.trim()) return;

    settings.connectDataSource({
      type: connectSourceModal.type,
      name: sourceFormName || connectSourceModal.name,
      description: connectSourceModal.description,
      url: sourceFormUrl,
      tools: connectSourceModal.tools,
    });

    setConnectSourceModal(null);
    setSourceFormName("");
    setSourceFormUrl("");
    toast.success(`${sourceFormName || connectSourceModal.name} conectado`);
  }

  function handleDisconnectSource(sourceId: string) {
    settings.disconnectDataSource(sourceId);
    setSourcePopoverId(null);
    toast.success("Fonte desconectada");
  }

  function handleSyncSource(sourceId: string) {
    settings.syncDataSource(sourceId);
    toast.success("Sincronização concluída");
  }

  function getSourceActions(sourceId: string): PopoverItem[] {
    return [
      { id: "configure", label: "Configurar", icon: Gear, onClick: () => setConfigureSource(sourceId) },
      { id: "sync", label: "Sincronizar", icon: ArrowsClockwise, onClick: () => handleSyncSource(sourceId) },
      { id: "disconnect", label: "Desconectar", icon: Trash, danger: true, onClick: () => handleDisconnectSource(sourceId) },
    ];
  }

  /* ——— Handlers: Tab 4 - Avançado ——— */

  function handleSaveCustomTone() {
    if (!toneFormName.trim() || !toneFormExample.trim()) return;

    if (editingTone) {
      settings.updateCustomTone(editingTone.id, {
        label: toneFormName,
        description: toneFormDesc,
        example: toneFormExample,
      });
      toast.success("Tom atualizado");
    } else {
      const newTone = settings.createCustomTone({
        label: toneFormName,
        description: toneFormDesc,
        example: toneFormExample,
      });
      settings.setToneId(newTone.id);
      toast.success("Tom personalizado criado");
    }
    setToneModalOpen(false);
  }

  function handleDeleteTone() {
    if (!deleteTone) return;
    settings.deleteCustomTone(deleteTone.id);
    setDeleteTone(null);
    toast.success("Tom excluído");
  }

  function handleAddTextDoc() {
    if (!docName.trim()) return;
    settings.addKnowledgeDoc({
      name: docName,
      type: "text",
      content: docContent,
    });
    setDocName("");
    setDocContent("");
    setAddDocType(null);
    toast.success("Documento adicionado");
  }

  function handleAddFileDoc() {
    if (!docFile) return;
    settings.addKnowledgeDoc({
      name: docFile.name,
      type: "file",
      size: `${(docFile.size / 1024 / 1024).toFixed(1)} MB`,
    });
    setDocFile(null);
    setAddDocType(null);
    toast.success("Arquivo enviado");
  }

  function handleUsageLimitChange(value: string) {
    if (value === "unlimited") {
      settings.setMonthlyUsageLimit(null);
    } else {
      settings.setMonthlyUsageLimit(parseInt(value, 10));
    }
  }

  /* ——— LLM Providers ——— */

  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [editingLlm, setEditingLlm] = useState<string | null>(null);
  const [llmProvider, setLlmProvider] = useState("");
  const [llmLabel, setLlmLabel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [deleteLlm, setDeleteLlm] = useState<{ id: string; label: string } | null>(null);
  const [llmPopoverId, setLlmPopoverId] = useState<string | null>(null);
  const llmPopoverRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function openAddLlm() {
    setEditingLlm(null);
    setLlmProvider("");
    setLlmLabel("");
    setLlmApiKey("");
    setLlmModel("");
    setLlmModalOpen(true);
  }

  function openEditLlm(record: { id: string; provider: string; label: string; apiKey: string; model: string }) {
    setEditingLlm(record.id);
    setLlmProvider(record.provider);
    setLlmLabel(record.label);
    setLlmApiKey(record.apiKey);
    setLlmModel(record.model);
    setLlmModalOpen(true);
  }

  function handleSaveLlm() {
    if (!llmProvider || !llmApiKey.trim()) return;
    const catalogItem = settings.llmProviderCatalog.find((c) => c.provider === llmProvider);
    const label = llmLabel.trim() || catalogItem?.name || llmProvider;
    const model = llmModel || catalogItem?.defaultModel || "";

    if (editingLlm) {
      settings.updateLlmProvider(editingLlm, { provider: llmProvider as import("@/lib/settings-store").LlmProvider, label, apiKey: llmApiKey, model });
      toast.success("Provedor atualizado");
    } else {
      settings.addLlmProvider({ provider: llmProvider as import("@/lib/settings-store").LlmProvider, label, apiKey: llmApiKey, model });
      toast.success("Provedor adicionado");
    }
    setLlmModalOpen(false);
  }

  function handleDeleteLlm() {
    if (!deleteLlm) return;
    settings.removeLlmProvider(deleteLlm.id);
    setDeleteLlm(null);
    toast.success("Provedor removido");
  }

  function getLlmActions(record: { id: string; provider: string; label: string; apiKey: string; model: string }): PopoverItem[] {
    return [
      { id: "edit", label: "Editar", icon: PencilSimple, onClick: () => openEditLlm(record) },
      { id: "delete", label: "Remover", icon: Trash, danger: true, onClick: () => setDeleteLlm({ id: record.id, label: record.label }) },
    ];
  }

  const llmModelOptions = useMemo(() => {
    const catalogItem = settings.llmProviderCatalog.find((c) => c.provider === llmProvider);
    if (!catalogItem || catalogItem.models.length === 0) return [];
    return catalogItem.models.map((m) => ({ value: m, label: m }));
  }, [llmProvider, settings.llmProviderCatalog]);

  function handleSaveAdvanced() {
    toast.success("Configurações avançadas salvas");
  }

  /* ——— Render ——— */

  return (
    <>
      <Card padding="none">
        <TabBar
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ariaLabel="Configurações de IA"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: ASSISTENTE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "assistant" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitle}>Tom de voz</div>
            <p className={styles.sectionDesc}>
              Defina como o Bud se comunica com os gestores da sua organização.
            </p>

            <div className={styles.toneGrid}>
              {TONE_PRESETS.map((preset) => {
                const IconComponent = TONE_ICONS[preset.iconName] ?? Handshake;
                const isActive = settings.aiSettings.toneId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.toneCard} ${isActive ? styles.toneCardActive : ""}`}
                    onClick={() => handleSelectTone(preset.id)}
                  >
                    <div className={styles.toneCardHeader}>
                      <div className={`${styles.toneCardIcon} ${isActive ? styles.toneCardIconActive : ""}`}>
                        <IconComponent size={20} />
                      </div>
                      {isActive && <CheckCircle size={20} className={styles.toneCheck} weight="fill" />}
                    </div>
                    <div className={styles.toneCardContent}>
                      <span className={styles.toneCardLabel}>{preset.label}</span>
                      <span className={styles.toneCardDesc}>{preset.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeTone && (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>
                  <Robot size={16} />
                  <span>Exemplo de como o Bud vai falar</span>
                </div>
                <p className={styles.previewText}>"{activeTone.example}"</p>
              </div>
            )}

            <div className={styles.divider} />

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>
                  <Clock size={18} />
                  Respeitar horário de trabalho
                </div>
                <span className={styles.settingDesc}>
                  Não enviar mensagens fora do horário configurado (compliance CLT)
                </span>
              </div>
              <Toggle
                checked={settings.aiSettings.respectWorkingHours}
                onChange={() => settings.setRespectWorkingHours(!settings.aiSettings.respectWorkingHours)}
              />
            </div>

            {settings.aiSettings.respectWorkingHours && (
              <div className={styles.timeInputRow}>
                <div className={styles.timeInput}>
                  <label className={styles.timeLabel}>Início</label>
                  <Input
                    value={settings.aiSettings.workingHoursStart}
                    onChange={(e) => settings.setWorkingHours(e.target.value, settings.aiSettings.workingHoursEnd)}
                    placeholder="08:00"
                    size="sm"
                  />
                </div>
                <div className={styles.timeInput}>
                  <label className={styles.timeLabel}>Fim</label>
                  <Input
                    value={settings.aiSettings.workingHoursEnd}
                    onChange={(e) => settings.setWorkingHours(settings.aiSettings.workingHoursStart, e.target.value)}
                    placeholder="19:00"
                    size="sm"
                  />
                </div>
              </div>
            )}

            <div className={styles.divider} />

            <div className={styles.formField}>
              <label className={styles.formLabel}>Idioma do assistente</label>
              <Select
                options={LANGUAGE_OPTIONS}
                value={settings.aiSettings.language}
                onChange={(v) => settings.setLanguage(v as string)}
              />
            </div>

            <div className={styles.saveRow}>
              <Button variant="primary" size="md" leftIcon={FloppyDisk} onClick={() => setConfirmSave("assistant")}>
                Salvar alterações
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: SUGESTÕES
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "suggestions" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionTitle}>Nível de proatividade</div>
            <p className={styles.sectionDesc}>
              Controle com que frequência o Bud faz sugestões proativas.
            </p>

            <div className={styles.proactivitySlider}>
              <div className={styles.proactivityTrack}>
                {(["minimum", "moderate", "default", "maximum"] as ProactivityLevel[]).map((level) => {
                  const isActive = settings.aiSettings.proactivityLevel === level;
                  const config = PROACTIVITY_LABELS[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      className={`${styles.proactivityOption} ${isActive ? styles.proactivityOptionActive : ""}`}
                      onClick={() => handleProactivityChange(level)}
                    >
                      <span className={styles.proactivityLabel}>{config.label}</span>
                      <span className={styles.proactivityDesc}>{config.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.sectionTitle}>Tipos de sugestão</div>
            <p className={styles.sectionDesc}>
              Escolha quais tipos de sugestão o Bud pode fazer.
            </p>

            <div className={styles.suggestionList}>
              <div className={styles.suggestionItem}>
                <div className={styles.suggestionInfo}>
                  <div className={styles.suggestionIcon}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <span className={styles.suggestionLabel}>Preparação de 1:1</span>
                    <span className={styles.suggestionDesc}>Briefing automático 24h antes de reuniões 1:1</span>
                  </div>
                </div>
                <Toggle
                  checked={settings.aiSettings.suggestionTypes.oneOnOnePrep}
                  onChange={() => settings.setSuggestionType("oneOnOnePrep", !settings.aiSettings.suggestionTypes.oneOnOnePrep)}
                />
              </div>

              <div className={styles.suggestionItem}>
                <div className={styles.suggestionInfo}>
                  <div className={styles.suggestionIcon}>
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <span className={styles.suggestionLabel}>Coaching e dicas de gestão</span>
                    <span className={styles.suggestionDesc}>Insights mensais sobre seu estilo de liderança</span>
                  </div>
                </div>
                <Toggle
                  checked={settings.aiSettings.suggestionTypes.coachingTips}
                  onChange={() => settings.setSuggestionType("coachingTips", !settings.aiSettings.suggestionTypes.coachingTips)}
                />
              </div>

              <div className={styles.suggestionItem}>
                <div className={styles.suggestionInfo}>
                  <div className={styles.suggestionIcon}>
                    <Warning size={20} />
                  </div>
                  <div>
                    <span className={styles.suggestionLabel}>Alertas sobre liderados</span>
                    <span className={styles.suggestionDesc}>Avisos quando engajamento ou performance caem</span>
                  </div>
                </div>
                <Toggle
                  checked={settings.aiSettings.suggestionTypes.teamAlerts}
                  onChange={() => settings.setSuggestionType("teamAlerts", !settings.aiSettings.suggestionTypes.teamAlerts)}
                />
              </div>

              <div className={styles.suggestionItem}>
                <div className={styles.suggestionInfo}>
                  <div className={styles.suggestionIcon}>
                    <PencilLine size={20} />
                  </div>
                  <div>
                    <span className={styles.suggestionLabel}>Rascunho de avaliação</span>
                    <span className={styles.suggestionDesc}>Pre-fill de avaliações baseado em dados do período</span>
                  </div>
                </div>
                <Toggle
                  checked={settings.aiSettings.suggestionTypes.reviewDrafts}
                  onChange={() => settings.setSuggestionType("reviewDrafts", !settings.aiSettings.suggestionTypes.reviewDrafts)}
                />
              </div>

              <div className={styles.suggestionItem}>
                <div className={styles.suggestionInfo}>
                  <div className={styles.suggestionIcon}>
                    <Crosshair size={20} />
                  </div>
                  <div>
                    <span className={styles.suggestionLabel}>Sugestão de OKRs</span>
                    <span className={styles.suggestionDesc}>Recomendar objetivos baseados em contexto estratégico</span>
                  </div>
                </div>
                <Toggle
                  checked={settings.aiSettings.suggestionTypes.okrSuggestions}
                  onChange={() => settings.setSuggestionType("okrSuggestions", !settings.aiSettings.suggestionTypes.okrSuggestions)}
                />
              </div>

              <div className={styles.suggestionItem}>
                <div className={styles.suggestionInfo}>
                  <div className={styles.suggestionIcon}>
                    <Newspaper size={20} />
                  </div>
                  <div>
                    <span className={styles.suggestionLabel}>Briefing diário</span>
                    <span className={styles.suggestionDesc}>Resumo das pendências e insights do dia</span>
                  </div>
                </div>
                <Toggle
                  checked={settings.aiSettings.suggestionTypes.dailyBriefing}
                  onChange={() => settings.setSuggestionType("dailyBriefing", !settings.aiSettings.suggestionTypes.dailyBriefing)}
                />
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.sectionTitle}>Transparência de dados</div>

            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="transparency"
                  checked={settings.aiSettings.transparencyMode === "always"}
                  onChange={() => settings.setTransparencyMode("always")}
                />
                <div>
                  <span className={styles.radioLabel}>Mostrar sempre quais dados a IA está usando</span>
                </div>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="transparency"
                  checked={settings.aiSettings.transparencyMode === "on_demand"}
                  onChange={() => settings.setTransparencyMode("on_demand")}
                />
                <div>
                  <span className={styles.radioLabel}>Mostrar fontes apenas quando eu pedir</span>
                </div>
              </label>
            </div>

            <button type="button" className={styles.linkButton}>
              <Eye size={16} />
              Ver histórico de sugestões
              <ArrowSquareOut size={14} />
            </button>

            <div className={styles.saveRow}>
              <Button variant="primary" size="md" leftIcon={FloppyDisk} onClick={() => setConfirmSave("suggestions")}>
                Salvar alterações
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: FONTES DE DADOS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "sources" && (
          <div className={styles.tabContent}>
            <Alert variant="info" title="Conecte ferramentas da sua empresa para que o Bud tenha mais contexto ao fazer sugestões personalizadas." />

            {settings.dataSources.length > 0 && (
              <>
                <div className={styles.sectionTitle}>Conectadas ({settings.dataSources.length})</div>
                <div className={styles.connectedList}>
                  {settings.dataSources.map((source) => {
                    const SourceIcon = DATA_SOURCE_ICONS[source.type] ?? Plugs;
                    return (
                      <div key={source.id} className={styles.connectedItem}>
                        <div className={styles.connectedLeft}>
                          <div className={styles.connectedIcon}>
                            <SourceIcon size={20} />
                          </div>
                          <div className={styles.connectedInfo}>
                            <div className={styles.connectedNameRow}>
                              <span className={styles.connectedName}>{source.name}</span>
                              <Badge color={source.status === "connected" ? "success" : source.status === "error" ? "error" : "neutral"} size="sm">
                                {source.status === "connected" ? "Conectado" : source.status === "error" ? "Erro" : "Desconectado"}
                              </Badge>
                            </div>
                            {source.accessSummary && (
                              <span className={styles.connectedMeta}>{source.accessSummary}</span>
                            )}
                            {source.lastSync && (
                              <span className={styles.connectedSync}>
                                <ArrowsClockwise size={14} />
                                Última sync: {new Date(source.lastSync).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.connectedActions}>
                          <Toggle
                            checked={source.enabled}
                            onChange={() => settings.toggleDataSource(source.id)}
                          />
                          <Button
                            ref={(el) => { sourcePopoverRefs.current[source.id] = el; }}
                            variant="secondary"
                            size="md"
                            leftIcon={DotsThreeVertical}
                            onClick={() => setSourcePopoverId(sourcePopoverId === source.id ? null : source.id)}
                          />
                          <Popover
                            items={getSourceActions(source.id)}
                            open={sourcePopoverId === source.id}
                            onClose={() => setSourcePopoverId(null)}
                            anchorRef={{ current: sourcePopoverRefs.current[source.id] ?? null }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className={styles.sectionTitle}>Adicionar fonte</div>

            <div className={styles.sourceGrid}>
              {settings.availableDataSources.map((item) => {
                const SourceIcon = DATA_SOURCE_ICONS[item.type] ?? Plugs;
                return (
                  <button
                    key={item.type}
                    type="button"
                    className={`${styles.sourceCard} ${item.requiresPro ? styles.sourceCardLocked : ""}`}
                    onClick={() => !item.requiresPro && openConnectSource(item)}
                    disabled={item.requiresPro}
                  >
                    {item.requiresPro && (
                      <div className={styles.sourceCardBadge}>
                        <Badge color="orange" size="sm" leftIcon={Lock}>Pro</Badge>
                      </div>
                    )}
                    <div className={styles.sourceCardIcon}>
                      <SourceIcon size={24} />
                    </div>
                    <span className={styles.sourceCardName}>{item.name}</span>
                  </button>
                );
              })}
            </div>

            {settings.dataSources.length === 0 && settings.availableDataSources.length === 0 && (
              <div className={styles.emptyState}>
                <Plugs size={32} />
                <p className={styles.emptyTitle}>Nenhuma fonte disponível</p>
                <p className={styles.emptyDesc}>Todas as fontes já estão conectadas.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: AVANÇADO
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "advanced" && (
          <div className={styles.tabContent}>
            <div className={styles.proBanner}>
              <Lock size={16} />
              <span>Configurações avançadas disponíveis nos planos Pro e Enterprise</span>
            </div>

            <div className={styles.sectionTitle}>Instruções personalizadas</div>
            <Textarea
              value={settings.aiSettings.customInstructions}
              onChange={(e) => settings.setCustomInstructions(e.target.value)}
              placeholder="Ex: Nunca use emojis. Sempre termine com uma pergunta ao gestor..."
              rows={4}
            />
            <p className={styles.fieldHint}>
              Diga ao Bud como se comunicar de forma específica para sua empresa.
            </p>

            <div className={styles.divider} />

            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>LLM própria</div>
              <Button variant="secondary" size="md" leftIcon={Plus} onClick={openAddLlm}>
                Adicionar provedor
              </Button>
            </div>
            <p className={styles.sectionDesc}>
              Use sua própria chave de API para modelos como Claude, GPT ou Gemini. Você pode adicionar mais de um provedor.
            </p>

            {settings.llmProviders.length > 0 ? (
              <div className={styles.customToneList}>
                {settings.llmProviders.map((provider) => {
                  const catalogItem = settings.llmProviderCatalog.find((c) => c.provider === provider.provider);
                  return (
                    <div key={provider.id} className={`${styles.customToneItem} ${provider.enabled ? styles.customToneItemActive : ""}`}>
                      <div className={styles.customToneContent}>
                        <div className={styles.customToneIcon}>
                          <Brain size={18} />
                        </div>
                        <div className={styles.customToneInfo}>
                          <span className={styles.customToneName}>{provider.label}</span>
                          <span className={styles.customToneDesc}>
                            {catalogItem?.name ?? provider.provider} · {provider.model}
                          </span>
                        </div>
                        <Toggle
                          checked={provider.enabled}
                          onChange={() => settings.toggleLlmProvider(provider.id)}
                        />
                      </div>
                      <Button
                        ref={(el) => { llmPopoverRefs.current[provider.id] = el; }}
                        variant="secondary"
                        size="md"
                        leftIcon={DotsThreeVertical}
                        onClick={() => setLlmPopoverId(llmPopoverId === provider.id ? null : provider.id)}
                      />
                      <Popover
                        items={getLlmActions(provider)}
                        open={llmPopoverId === provider.id}
                        onClose={() => setLlmPopoverId(null)}
                        anchorRef={{ current: llmPopoverRefs.current[provider.id] ?? null }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyHint}>Nenhum provedor de LLM adicionado. O Bud usará o modelo padrão.</p>
            )}

            <div className={styles.divider} />

            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Canais de atuação</div>
            </div>
            <p className={styles.sectionDesc}>
              Defina onde o assistente pode interagir com os colaboradores da sua empresa.
            </p>

            <div className={styles.toggleList}>
              {/* Platform — always available */}
              <div className={styles.toggleItem}>
                <div className={styles.channelRow}>
                  <div className={styles.channelIcon} style={{ backgroundColor: "var(--color-orange-100)", color: "var(--color-orange-700)" }}>
                    <Globe size={18} />
                  </div>
                  <div>
                    <span className={styles.toggleLabel}>Plataforma Bud</span>
                    <span className={styles.toggleDesc}>Chat, briefings, sugestões inline</span>
                  </div>
                </div>
                <Toggle
                  checked={settings.aiSettings.aiChannels?.platform !== false}
                  onChange={() => settings.setAiChannel("platform", !(settings.aiSettings.aiChannels?.platform !== false))}
                />
              </div>

              {/* Communication integrations */}
              {(() => {
                const CHANNEL_META: Record<string, { icon: Icon; features: string }> = {
                  slack: { icon: SlackLogo, features: "Nudges, check-ins, respostas no canal" },
                  teams: { icon: MicrosoftTeamsLogo, features: "Bot nativo, nudges, check-ins" },
                  whatsapp: { icon: WhatsappLogo, features: "Lembretes, nudges, notificações" },
                  email: { icon: Envelope, features: "Digest semanal, notificações" },
                };

                const commIntegrations = integrations.integrations.filter(
                  (i) => i.category === "communication"
                );

                return commIntegrations.map((integration) => {
                  const meta = CHANNEL_META[integration.id];
                  const ChannelIcon = meta?.icon ?? ChatCircle;
                  const isConnected = integration.status === "connected";
                  const isEnabled = settings.aiSettings.aiChannels?.[integration.id] === true;

                  return (
                    <div key={integration.id} className={styles.toggleItem}>
                      <div className={styles.channelRow}>
                        <div
                          className={styles.channelIcon}
                          style={{
                            backgroundColor: `var(${integration.iconBg})`,
                            color: `var(${integration.iconColor})`,
                          }}
                        >
                          <ChannelIcon size={18} />
                        </div>
                        <div>
                          <span className={styles.toggleLabel}>
                            {integration.name}
                            {isConnected && (
                              <Badge color="success" size="sm" style={{ marginLeft: "var(--sp-2xs)" }}>Conectado</Badge>
                            )}
                          </span>
                          <span className={styles.toggleDesc}>
                            {isConnected
                              ? (meta?.features ?? integration.features.slice(0, 3).join(", "))
                              : "Integração não configurada"}
                          </span>
                        </div>
                      </div>
                      {isConnected ? (
                        <Toggle
                          checked={isEnabled}
                          onChange={() => settings.setAiChannel(integration.id, !isEnabled)}
                        />
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          rightIcon={ArrowSquareOut}
                          onClick={() => navigate("/settings/integrations")}
                        >
                          Conectar
                        </Button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <button
              type="button"
              className={styles.inlineLink}
              onClick={() => navigate("/settings/integrations")}
            >
              <Plugs size={14} />
              <span>Gerenciar integrações</span>
              <ArrowSquareOut size={12} />
            </button>

            <div className={styles.divider} />

            <div className={styles.toggleList}>
              <div className={styles.toggleItem}>
                <div>
                  <span className={styles.toggleLabel}>Detecção de viés</span>
                  <span className={styles.toggleDesc}>Identificar padrões de linguagem tendenciosa em avaliações</span>
                </div>
                <Toggle
                  checked={settings.aiSettings.biasDetectionEnabled}
                  onChange={() => settings.setBiasDetectionEnabled(!settings.aiSettings.biasDetectionEnabled)}
                />
              </div>
              <div className={styles.toggleItem}>
                <div>
                  <span className={styles.toggleLabel}>Compartilhar dados anônimos</span>
                  <span className={styles.toggleDesc}>Ajuda a melhorar o modelo de IA do Bud</span>
                </div>
                <Toggle
                  checked={settings.aiSettings.dataSharingEnabled}
                  onChange={() => settings.setDataSharingEnabled(!settings.aiSettings.dataSharingEnabled)}
                />
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.enterpriseBanner}>
              <Lock size={16} />
              <span>Enterprise</span>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Limite de uso mensal</label>
              <Select
                options={USAGE_LIMIT_OPTIONS}
                value={usageLimitValue}
                onChange={(v) => handleUsageLimitChange(v as string)}
              />
              <p className={styles.fieldHint}>
                Controle o custo de IA para sua organização.
              </p>
            </div>

            <div className={styles.saveRow}>
              <Button variant="primary" size="md" leftIcon={FloppyDisk} onClick={() => setConfirmSave("advanced")}>
                Salvar alterações
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════ */}

      {/* Connect data source modal */}
      <Modal open={!!connectSourceModal} onClose={() => setConnectSourceModal(null)} size="md">
        {connectSourceModal && (
          <>
            <ModalHeader title={`Conectar ${connectSourceModal.name}`} onClose={() => setConnectSourceModal(null)} />
            <ModalBody>
              <div className={styles.formStack}>
                <p className={styles.detailDesc}>{connectSourceModal.description}</p>

                {connectSourceModal.tools.length > 0 && (
                  <div className={styles.detailSection}>
                    <span className={styles.detailSectionTitle}>Funcionalidades disponíveis</span>
                    <div className={styles.detailTools}>
                      {connectSourceModal.tools.map((tool) => (
                        <div key={tool} className={styles.detailToolItem}>
                          <CheckCircle size={16} />
                          <span>{tool}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Input
                  label="Nome da conexão"
                  value={sourceFormName}
                  onChange={(e) => setSourceFormName(e.target.value)}
                  placeholder={connectSourceModal.name}
                />
                <Input
                  label="URL do servidor"
                  value={sourceFormUrl}
                  onChange={(e) => setSourceFormUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="tertiary" size="md" onClick={() => setConnectSourceModal(null)}>Cancelar</Button>
              <Button variant="primary" size="md" leftIcon={Plugs} disabled={!sourceFormUrl.trim()} onClick={handleConnectSource}>
                Conectar
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Configure data source modal */}
      <Modal open={!!configureSource} onClose={() => setConfigureSource(null)} size="md">
        {configureSource && (() => {
          const source = settings.dataSources.find((s) => s.id === configureSource);
          if (!source) return null;
          return (
            <>
              <ModalHeader title={`Configurar ${source.name}`} onClose={() => setConfigureSource(null)} />
              <ModalBody>
                <div className={styles.formStack}>
                  <Input
                    label="Nome"
                    value={source.name}
                    onChange={(e) => settings.updateDataSource(source.id, { name: e.target.value })}
                  />
                  <Input
                    label="URL"
                    value={source.url}
                    onChange={(e) => settings.updateDataSource(source.id, { url: e.target.value })}
                  />
                  {source.tools.length > 0 && (
                    <div className={styles.detailSection}>
                      <span className={styles.detailSectionTitle}>Ferramentas ativas</span>
                      <div className={styles.configToolList}>
                        {source.tools.map((tool) => (
                          <div key={tool} className={styles.configToolItem}>
                            <Toggle checked />
                            <span className={styles.configToolText}>{tool}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="tertiary" size="md" onClick={() => setConfigureSource(null)}>Cancelar</Button>
                <Button variant="primary" size="md" onClick={() => { setConfigureSource(null); toast.success("Configuração salva"); }}>Salvar</Button>
              </ModalFooter>
            </>
          );
        })()}
      </Modal>

      {/* Create/Edit custom tone modal */}
      <Modal open={toneModalOpen} onClose={() => setToneModalOpen(false)} size="md">
        <ModalHeader title={editingTone ? "Editar tom" : "Criar tom personalizado"} onClose={() => setToneModalOpen(false)} />
        <ModalBody>
          <div className={styles.formStack}>
            <Input
              label="Nome do tom"
              value={toneFormName}
              onChange={(e) => setToneFormName(e.target.value)}
              placeholder="Ex: Casual e descontraído"
            />
            <Textarea
              label="Descrição"
              value={toneFormDesc}
              onChange={(e) => setToneFormDesc(e.target.value)}
              placeholder="Descreva o estilo de comunicação deste tom..."
              rows={2}
            />
            <Textarea
              label="Exemplo de mensagem"
              value={toneFormExample}
              onChange={(e) => setToneFormExample(e.target.value)}
              placeholder="Escreva um exemplo de como o Bud se comunicaria usando este tom. Ex: O engajamento do time de Design caiu 12%..."
              rows={4}
            />
            {toneFormExample.trim() && (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>
                  <Robot size={16} />
                  <span>Pré-visualização</span>
                </div>
                <p className={styles.previewText}>"{toneFormExample}"</p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setToneModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!toneFormName.trim() || !toneFormExample.trim()} onClick={handleSaveCustomTone}>
            {editingTone ? "Salvar" : "Criar tom"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete custom tone confirmation */}
      <Modal open={!!deleteTone} onClose={() => setDeleteTone(null)} size="sm">
        <ModalHeader title="Excluir tom" onClose={() => setDeleteTone(null)} />
        <ModalBody>
          {deleteTone && (
            <p className={styles.confirmText}>
              Tem certeza que deseja excluir o tom <strong>{deleteTone.label}</strong>?
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeleteTone(null)}>Cancelar</Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleDeleteTone}>Excluir</Button>
        </ModalFooter>
      </Modal>

      {/* Add text document modal */}
      <Modal open={addDocType === "text"} onClose={() => setAddDocType(null)} size="md">
        <ModalHeader title="Adicionar texto" onClose={() => setAddDocType(null)} />
        <ModalBody>
          <div className={styles.formStack}>
            <Input label="Título" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Ex: Descrição da empresa" />
            <Textarea
              label="Conteúdo"
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Cole aqui informações sobre sua empresa, cultura, processos, valores..."
              rows={8}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setAddDocType(null)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!docName.trim()} onClick={handleAddTextDoc}>Adicionar</Button>
        </ModalFooter>
      </Modal>

      {/* Upload file modal */}
      <Modal open={addDocType === "file"} onClose={() => setAddDocType(null)} size="sm">
        <ModalHeader title="Enviar arquivo" onClose={() => setAddDocType(null)} />
        <ModalBody>
          <div className={styles.formStack}>
            <Alert variant="info" title="Envie documentos como PDFs, Word ou texto. O Bud irá processar o conteúdo para usar como referência." />
            <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                className={styles.fileInput}
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
              {docFile ? (
                <div className={styles.uploadedFile}>
                  <File size={24} />
                  <span className={styles.uploadFileName}>{docFile.name}</span>
                  <Button variant="tertiary" size="sm" leftIcon={X} onClick={(e) => { e.stopPropagation(); setDocFile(null); }} />
                </div>
              ) : (
                <>
                  <Upload size={24} />
                  <span className={styles.uploadText}>Arraste ou clique para selecionar</span>
                  <span className={styles.uploadHint}>.pdf, .doc, .docx, .txt, .md</span>
                </>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setAddDocType(null)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!docFile} onClick={handleAddFileDoc}>Enviar</Button>
        </ModalFooter>
      </Modal>

      {/* Add/Edit LLM provider modal */}
      <Modal open={llmModalOpen} onClose={() => setLlmModalOpen(false)} size="md">
        <ModalHeader title={editingLlm ? "Editar provedor" : "Adicionar provedor de LLM"} onClose={() => setLlmModalOpen(false)} />
        <ModalBody>
          <div className={styles.formStack}>
            <Select
              label="Provedor"
              options={settings.llmProviderCatalog.map((c) => ({ value: c.provider, label: c.name }))}
              value={llmProvider}
              onChange={(v) => {
                setLlmProvider(v as string);
                const cat = settings.llmProviderCatalog.find((c) => c.provider === v);
                if (cat) {
                  setLlmModel(cat.defaultModel);
                  if (!llmLabel.trim()) setLlmLabel(cat.name);
                }
              }}
              placeholder="Selecione o provedor"
            />
            <Input
              label="Nome da conexão"
              value={llmLabel}
              onChange={(e) => setLlmLabel(e.target.value)}
              placeholder="Ex: Claude para análises"
            />
            <Input
              label="API Key"
              value={llmApiKey}
              onChange={(e) => setLlmApiKey(e.target.value)}
              placeholder="sk-..."
            />
            {llmModelOptions.length > 0 ? (
              <Select
                label="Modelo"
                options={llmModelOptions}
                value={llmModel}
                onChange={(v) => setLlmModel(v as string)}
              />
            ) : (
              <Input
                label="Modelo"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder="Nome do modelo"
              />
            )}
            {llmProvider && (() => {
              const cat = settings.llmProviderCatalog.find((c) => c.provider === llmProvider);
              return cat ? <p className={styles.fieldHint}>{cat.description}</p> : null;
            })()}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setLlmModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!llmProvider || !llmApiKey.trim()} onClick={handleSaveLlm}>
            {editingLlm ? "Salvar" : "Adicionar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm save changes modal */}
      <Modal open={!!confirmSave} onClose={() => setConfirmSave(null)} size="sm">
        <ModalHeader title="Confirmar alterações" onClose={() => setConfirmSave(null)} />
        <ModalBody>
          <div className={styles.confirmSaveBody}>
            <Warning size={32} className={styles.confirmSaveIcon} />
            <p className={styles.confirmText}>
              Essas alterações serão aplicadas para <strong>todos os usuários</strong> da empresa. Deseja continuar?
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="md" onClick={() => setConfirmSave(null)}>Cancelar</Button>
          <Button variant="primary" size="md" onClick={() => {
            if (confirmSave === "assistant") handleSaveAssistant();
            else if (confirmSave === "suggestions") handleSaveSuggestions();
            else if (confirmSave === "advanced") handleSaveAdvanced();
            setConfirmSave(null);
          }}>Confirmar e salvar</Button>
        </ModalFooter>
      </Modal>

      {/* Delete LLM provider confirmation */}
      <Modal open={!!deleteLlm} onClose={() => setDeleteLlm(null)} size="sm">
        <ModalHeader title="Remover provedor" onClose={() => setDeleteLlm(null)} />
        <ModalBody>
          {deleteLlm && (
            <p className={styles.confirmText}>
              Tem certeza que deseja remover o provedor <strong>{deleteLlm.label}</strong>?
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setDeleteLlm(null)}>Cancelar</Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={handleDeleteLlm}>Remover</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
