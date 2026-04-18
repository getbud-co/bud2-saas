import { useState, useMemo } from "react";
import {
  Card,
  Button,
  Badge,
  Toggle,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Alert,
  TabBar,
  toast,
} from "@getbud-co/buds";
import { formatRelativeTime } from "@/lib/date-format";
import {
  SlackLogo,
  MicrosoftTeamsLogo,
  WhatsappLogo,
  Envelope,
  GoogleLogo,
  ChartBar,
  Database,
  ShieldCheck,
  Plugs,
  CalendarBlank,
  MicrosoftOutlookLogo,
  GitBranch,
  WebhooksLogo,
  Key,
  ArrowsClockwise,
  Gear,
  MagnifyingGlass,
  CheckCircle,
  Upload,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useIntegrationsData } from "@/contexts/IntegrationsDataContext";
import type { IntegrationRecord, IntegrationCategory } from "@/lib/integrations-store";
import styles from "./IntegrationsModule.module.css";

/** Map iconId strings to actual icon components */
const ICON_MAP: Record<string, Icon> = {
  SlackLogo,
  MicrosoftTeamsLogo,
  WhatsappLogo,
  Envelope,
  GoogleLogo,
  ChartBar,
  Database,
  ShieldCheck,
  Plugs,
  CalendarBlank,
  MicrosoftOutlookLogo,
  GitBranch,
  WebhooksLogo,
  Key,
  Upload,
};

function getIcon(iconId: string): Icon {
  return ICON_MAP[iconId] ?? Plugs;
}

const CATEGORY_TABS = [
  { value: "all", label: "Todas" },
  { value: "communication", label: "Comunicação" },
  { value: "calendar", label: "Calendário" },
  { value: "hris", label: "RH e Dados" },
  { value: "pm", label: "Gestão de Projetos" },
  { value: "auth", label: "Autenticação" },
  { value: "api", label: "API e Webhooks" },
];

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  communication: "Comunicação",
  calendar: "Calendário",
  hris: "RH e Dados",
  pm: "Gestão de Projetos",
  auth: "Autenticação",
  api: "API e Webhooks",
};

export function IntegrationsModule() {
  const {
    connectedIntegrations: connected,
    disconnectedIntegrations,
    connectIntegration,
    disconnectIntegration,
    toggleIntegrationEnabled,
  } = useIntegrationsData();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("connected");
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | "all">("all");
  const [configuring, setConfiguring] = useState<IntegrationRecord | null>(null);
  const [detailModal, setDetailModal] = useState<IntegrationRecord | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const filtered = useMemo(() => {
    let result = disconnectedIntegrations;
    if (activeCategory !== "all") {
      result = result.filter((i) => i.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [disconnectedIntegrations, activeCategory, search]);

  function handleToggle(id: string) {
    toggleIntegrationEnabled(id);
  }

  function handleConnect(integration: IntegrationRecord) {
    connectIntegration(integration.id);
    toast.success(`${integration.name} conectado com sucesso`);
  }

  function handleDisconnect(id: string) {
    disconnectIntegration(id);
    toast.success("Integracao desconectada");
  }

  function handleSaveConfig() {
    setConfiguring(null);
    setApiKey("");
    setWebhookUrl("");
    toast.success("Configuracao salva");
  }

  function openDetail(integration: IntegrationRecord) {
    setDetailModal(integration);
  }

  function openConfigure(integration: IntegrationRecord) {
    setConfiguring(integration);
    setApiKey("");
    setWebhookUrl("");
  }

  const mainTabs = useMemo(() => [
    { value: "connected", label: "Conectadas", badge: connected.length > 0 ? <Badge color="neutral" size="sm">{connected.length}</Badge> : undefined },
    { value: "available", label: "Disponíveis" },
  ], [connected.length]);

  return (
    <>
    <Card padding="none">
        <TabBar
          tabs={mainTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ariaLabel="Navegação de integrações"
        />

        {/* Connected integrations */}
        {activeTab === "connected" && (
          <>
            {connected.length > 0 ? (
              <div className={styles.connectedList}>
                {connected.map((integration) => {
                  const Icon = getIcon(integration.iconId);
                  return (
                    <div key={integration.id} className={styles.connectedItem}>
                      <div className={styles.connectedLeft}>
                        <div
                          className={styles.connectedIcon}
                          style={{ backgroundColor: integration.iconBg, color: integration.iconColor }}
                        >
                          <Icon size={20} />
                        </div>
                        <div className={styles.connectedInfo}>
                          <div className={styles.connectedNameRow}>
                            <span className={styles.connectedName}>{integration.name}</span>
                            <Badge color="success" size="sm">Conectado</Badge>
                          </div>
                          {integration.lastSync && (
                            <span className={styles.connectedSync}>
                              <ArrowsClockwise size={14} />
                              {integration.lastSync === "always_active"
                                ? "Sempre ativo"
                                : formatRelativeTime(integration.lastSync)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.connectedActions}>
                        <Toggle
                          checked={integration.enabled}
                          onChange={() => handleToggle(integration.id)}
                        />
                        <Button
                          variant="tertiary"
                          size="md"
                          leftIcon={Gear}
                          onClick={() => openConfigure(integration)}
                        />
                        <Button
                          variant="tertiary"
                          size="md"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Plugs size={32} />
                <p className={styles.emptyTitle}>Nenhuma integração conectada</p>
                <p className={styles.emptyDesc}>
                  Conecte integrações na aba "Disponíveis" para vê-las aqui.
                </p>
              </div>
            )}
          </>
        )}

        {/* Available integrations */}
        {activeTab === "available" && (
          <>
            <div className={styles.toolbar}>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar integração..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={MagnifyingGlass}
                />
              </div>
              <TabBar
                tabs={CATEGORY_TABS}
                activeTab={activeCategory}
                onTabChange={(v) => setActiveCategory(v as IntegrationCategory | "all")}
                ariaLabel="Filtrar por categoria"
              />
            </div>

            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <Plugs size={32} />
                <p className={styles.emptyTitle}>Nenhuma integração encontrada</p>
                <p className={styles.emptyDesc}>
                  Tente ajustar os filtros ou a busca para encontrar o que procura.
                </p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filtered.map((integration) => {
                  const Icon = getIcon(integration.iconId);
                  return (
                    <button
                      type="button"
                      key={integration.id}
                      className={styles.integrationCard}
                      onClick={() => openDetail(integration)}
                    >
                      <div className={styles.cardTop}>
                        <div
                          className={styles.cardIcon}
                          style={{ backgroundColor: integration.iconBg, color: integration.iconColor }}
                        >
                          <Icon size={24} />
                        </div>
                        <div className={styles.cardBadges}>
                          {integration.popular && (
                            <Badge color="orange" size="sm">Popular</Badge>
                          )}
                          <Badge color="neutral" size="sm">
                            {CATEGORY_LABELS[integration.category]}
                          </Badge>
                        </div>
                      </div>
                      <div className={styles.cardContent}>
                        <h4 className={styles.cardName}>{integration.name}</h4>
                        <p className={styles.cardDesc}>{integration.description}</p>
                      </div>
                      {integration.features && (
                        <div className={styles.cardFeatures}>
                          {integration.features.slice(0, 3).map((f) => (
                            <span key={f} className={styles.featureTag}>{f}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
    </Card>

      {/* Detail / Connect modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} size="md">
        {detailModal && (
          <>
            <ModalHeader title={detailModal.name} onClose={() => setDetailModal(null)} />
            <ModalBody>
              <div className={styles.detailContent}>
                <div className={styles.detailHeader}>
                  <div
                    className={styles.detailIcon}
                    style={{ backgroundColor: detailModal.iconBg, color: detailModal.iconColor }}
                  >
                    {(() => { const Icon = getIcon(detailModal.iconId); return <Icon size={32} />; })()}
                  </div>
                  <div className={styles.detailMeta}>
                    <Badge color="neutral" size="sm">{CATEGORY_LABELS[detailModal.category]}</Badge>
                    {detailModal.popular && <Badge color="orange" size="sm">Popular</Badge>}
                  </div>
                </div>

                <p className={styles.detailDesc}>{detailModal.description}</p>

                {detailModal.features && detailModal.features.length > 0 && (
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailSectionTitle}>Funcionalidades</h4>
                    <div className={styles.detailFeatures}>
                      {detailModal.features.map((f) => (
                        <div key={f} className={styles.detailFeatureItem}>
                          <CheckCircle size={16} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Alert
                  variant="info"
                  title="Ao conectar, a integração será configurada com as permissões padrão. Você pode ajustar as configurações após a conexão."
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="tertiary" size="md" onClick={() => setDetailModal(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={Plugs}
                onClick={() => {
                  handleConnect(detailModal);
                  setDetailModal(null);
                }}
              >
                Conectar {detailModal.name}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Config modal */}
      <Modal open={!!configuring} onClose={() => setConfiguring(null)} size="md">
        {configuring && (
          <>
            <ModalHeader title={`Configurar ${configuring.name}`} onClose={() => setConfiguring(null)} />
            <ModalBody>
              <div className={styles.formStack}>
                <Alert
                  variant="info"
                  title={`Configure as credenciais e preferências da integração com ${configuring.name}.`}
                />
                <Input
                  label="API Key / Token"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole sua chave de API aqui"
                  type="password"
                />
                <Input
                  label="Webhook URL (opcional)"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://..."
                />
                {configuring.features && configuring.features.length > 0 && (
                  <div className={styles.configFeaturesSection}>
                    <span className={styles.configFeaturesLabel}>Funcionalidades ativas</span>
                    <div className={styles.configFeaturesList}>
                      {configuring.features.map((f) => (
                        <div key={f} className={styles.configFeatureItem}>
                          <Toggle checked />
                          <span className={styles.configFeatureText}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="tertiary" size="md" leftIcon={ArrowSquareOut}>
                Documentação
              </Button>
              <div className={styles.footerSpacer} />
              <Button variant="tertiary" size="md" onClick={() => setConfiguring(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" onClick={handleSaveConfig}>
                Salvar configuração
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </>
  );
}
