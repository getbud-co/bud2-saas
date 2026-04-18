import { useState, useRef, useMemo } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Toggle,
  Select,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Popover,
  toast,
} from "@getbud-co/buds";
import type { PopoverItem } from "@getbud-co/buds";
import {
  Plus,
  Trash,
  FloppyDisk,
  CheckCircle,
  Robot,
  Brain,
  ChatCircle,
  Handshake,
  Target,
  Lightning,
  SlidersHorizontal,
  PencilSimple,
  DotsThreeVertical,
  Calendar,
  Lightbulb,
  Warning,
  PencilLine,
  Crosshair,
  Newspaper,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useSettingsData } from "@/contexts/SettingsDataContext";
import { TONE_PRESETS, type ProactivityLevel, type LlmProvider } from "@/lib/settings-store";
import styles from "./CustomizeTab.module.css";

/* ——— Constants ——— */

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

const TONE_ICONS: Record<string, Icon> = {
  Handshake,
  Target,
  ChatCircle,
  Brain,
  Lightning,
  SlidersHorizontal,
};

/* ——— Component ——— */

export function CustomizeTab() {
  const settings = useSettingsData();

  // ─── Tone state ───
  const [toneModalOpen, setToneModalOpen] = useState(false);
  const [toneFormName, setToneFormName] = useState("");
  const [toneFormDesc, setToneFormDesc] = useState("");
  const [toneFormExample, setToneFormExample] = useState("");
  const [deleteTone, setDeleteTone] = useState<{ id: string; label: string } | null>(null);

  // ─── LLM state ───
  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [editingLlm, setEditingLlm] = useState<string | null>(null);
  const [llmProvider, setLlmProvider] = useState("");
  const [llmLabel, setLlmLabel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [deleteLlm, setDeleteLlm] = useState<{ id: string; label: string } | null>(null);
  const [llmPopoverId, setLlmPopoverId] = useState<string | null>(null);
  const llmPopoverRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ─── Derived data ───
  const activeTone = useMemo(() => {
    const systemTone = TONE_PRESETS.find((t) => t.id === settings.aiSettings.toneId);
    if (systemTone) return { ...systemTone, isCustom: false };

    const customTone = settings.customTones.find((t) => t.id === settings.aiSettings.toneId);
    if (customTone) return { ...customTone, iconName: "SlidersHorizontal", isCustom: true };

    return { ...TONE_PRESETS[0]!, isCustom: false };
  }, [settings.aiSettings.toneId, settings.customTones]);

  const llmModelOptions = useMemo(() => {
    const catalogItem = settings.llmProviderCatalog.find((c) => c.provider === llmProvider);
    if (!catalogItem || catalogItem.models.length === 0) return [];
    return catalogItem.models.map((m) => ({ value: m, label: m }));
  }, [llmProvider, settings.llmProviderCatalog]);

  /* ——— Handlers: Tone ——— */

  function handleSelectTone(toneId: string) {
    settings.setToneId(toneId);
  }

  function openCreateTone() {
    setToneFormName("");
    setToneFormDesc("");
    setToneFormExample("");
    setToneModalOpen(true);
  }

  function handleSaveCustomTone() {
    if (!toneFormName.trim() || !toneFormExample.trim()) return;

    const newTone = settings.createCustomTone({
      label: toneFormName,
      description: toneFormDesc,
      example: toneFormExample,
    });
    settings.setToneId(newTone.id);
    setToneModalOpen(false);
    toast.success("Tom personalizado criado");
  }

  function handleDeleteTone() {
    if (!deleteTone) return;
    settings.deleteCustomTone(deleteTone.id);
    setDeleteTone(null);
    toast.success("Tom excluído");
  }

  /* ——— Handlers: Suggestions ——— */

  function handleProactivityChange(level: ProactivityLevel) {
    settings.setProactivityLevel(level);
  }

  /* ——— Handlers: LLM ——— */

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
      settings.updateLlmProvider(editingLlm, { provider: llmProvider as LlmProvider, label, apiKey: llmApiKey, model });
      toast.success("Provedor atualizado");
    } else {
      settings.addLlmProvider({ provider: llmProvider as LlmProvider, label, apiKey: llmApiKey, model });
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

  /* ——— Handler: Save ——— */

  function handleSave() {
    toast.success("Preferências pessoais salvas");
  }

  /* ——— Render ——— */

  return (
    <>
      <Card padding="sm">
        <CardBody>
          <div className={styles.tabContent}>
        {/* ═══ SECTION 1: TOM DE VOZ ═══ */}
        <div className={styles.sectionTitle}>Tom de voz</div>
        <p className={styles.sectionDesc}>
          Escolha como o Bud se comunica com você. Esta é uma preferência pessoal e não afeta outros usuários.
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

        {/* Custom tones */}
        {settings.customTones.length > 0 && (
          <div className={styles.customToneList}>
            {settings.customTones.map((tone) => {
              const isActive = settings.aiSettings.toneId === tone.id;
              return (
                <div key={tone.id} className={`${styles.customToneItem} ${isActive ? styles.customToneItemActive : ""}`}>
                  <button
                    type="button"
                    className={styles.customToneContent}
                    onClick={() => handleSelectTone(tone.id)}
                  >
                    <div className={styles.customToneIcon}>
                      <SlidersHorizontal size={18} />
                    </div>
                    <div className={styles.customToneInfo}>
                      <span className={styles.customToneName}>{tone.label}</span>
                      <span className={styles.customToneDesc}>{tone.description}</span>
                    </div>
                  </button>
                  {isActive && <CheckCircle size={20} className={styles.toneCheck} weight="fill" />}
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={Trash}
                    onClick={() => setDeleteTone({ id: tone.id, label: tone.label })}
                  />
                </div>
              );
            })}
          </div>
        )}

        <Button variant="secondary" size="md" leftIcon={Plus} onClick={openCreateTone}>
          Criar tom personalizado
        </Button>

        <div className={styles.divider} />

        {/* ═══ SECTION 2: IDIOMA ═══ */}
        <div className={styles.sectionTitle}>Idioma</div>
        <p className={styles.sectionDesc}>
          Idioma preferido para as respostas do assistente. Esta configuração é pessoal.
        </p>

        <div className={styles.formField}>
          <Select
            options={LANGUAGE_OPTIONS}
            value={settings.aiSettings.language}
            onChange={(v) => settings.setLanguage(v as string)}
          />
        </div>

        <div className={styles.divider} />

        {/* ═══ SECTION 3: SUGESTOES ═══ */}
        <div className={styles.sectionTitle}>Sugestões</div>

        <p className={styles.sectionDesc}>
          Controle com que frequência o Bud faz sugestões proativas para você.
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

        <div className={styles.sectionTitle}>Tipos de sugestão</div>
        <p className={styles.sectionDesc}>
          Escolha quais tipos de sugestão o Bud pode fazer para você.
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
              name="personal-transparency"
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
              name="personal-transparency"
              checked={settings.aiSettings.transparencyMode === "on_demand"}
              onChange={() => settings.setTransparencyMode("on_demand")}
            />
            <div>
              <span className={styles.radioLabel}>Mostrar fontes apenas quando eu pedir</span>
            </div>
          </label>
        </div>

        <div className={styles.divider} />

        {/* ═══ SECTION 4: LLM PROPRIA ═══ */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>LLM própria</div>
          <Button variant="secondary" size="md" leftIcon={Plus} onClick={openAddLlm}>
            Adicionar provedor
          </Button>
        </div>
        <p className={styles.sectionDesc}>
          Conecte sua própria chave de API para usar modelos como Claude, GPT ou Gemini. Os provedores configurados aqui são pessoais e não afetam outros usuários.
        </p>

        {settings.llmProviders.length > 0 ? (
          <div className={styles.llmList}>
            {settings.llmProviders.map((provider) => {
              const catalogItem = settings.llmProviderCatalog.find((c) => c.provider === provider.provider);
              return (
                <div key={provider.id} className={`${styles.llmItem} ${provider.enabled ? styles.llmItemActive : ""}`}>
                  <div className={styles.llmContent}>
                    <div className={styles.llmIcon}>
                      <Brain size={18} />
                    </div>
                    <div className={styles.llmInfo}>
                      <span className={styles.llmName}>{provider.label}</span>
                      <span className={styles.llmMeta}>
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

        {/* ═══ SAVE ═══ */}
        <div className={styles.saveRow}>
          <Button variant="primary" size="md" leftIcon={FloppyDisk} onClick={handleSave}>
            Salvar preferências
          </Button>
        </div>
          </div>
        </CardBody>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════ */}

      {/* Create custom tone modal */}
      <Modal open={toneModalOpen} onClose={() => setToneModalOpen(false)} size="md">
        <ModalHeader title="Criar tom personalizado" onClose={() => setToneModalOpen(false)} />
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
              placeholder="Escreva um exemplo de como o Bud se comunicaria usando este tom..."
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
            Criar tom
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
                  setLlmLabel(cat.name);
                  setLlmModel(cat.defaultModel);
                }
              }}
            />
            {llmProvider && (
              <>
                <Input
                  label="Nome (opcional)"
                  value={llmLabel}
                  onChange={(e) => setLlmLabel(e.target.value)}
                  placeholder="Ex: Meu Claude pessoal"
                />
                <Input
                  label="Chave de API"
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
                <p className={styles.fieldHint}>
                  Sua chave de API é armazenada de forma segura e usada apenas para suas interações pessoais com o assistente.
                </p>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setLlmModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!llmProvider || !llmApiKey.trim()} onClick={handleSaveLlm}>
            {editingLlm ? "Salvar" : "Adicionar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete LLM provider confirmation */}
      <Modal open={!!deleteLlm} onClose={() => setDeleteLlm(null)} size="sm">
        <ModalHeader title="Remover provedor" onClose={() => setDeleteLlm(null)} />
        <ModalBody>
          {deleteLlm && (
            <p className={styles.confirmText}>
              Tem certeza que deseja remover <strong>{deleteLlm.label}</strong>? Sua chave de API será apagada.
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
