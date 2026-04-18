import { useState, type ChangeEvent } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  Toggle,
  Radio,
  Checkbox,
  Textarea,
  DatePicker,
  Badge,
  Alert,
  toast,
} from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import {
  Eye,
  Broadcast,
  Trash,
  Pause,
  Play,
  Clock,
  EnvelopeSimple,
  Copy,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { SurveyResultData } from "../types";
import styles from "./SettingsTab.module.css";

/* ——— Status actions ——— */

const STATUS_ACTIONS: Record<string, { label: string; icon: Icon; variant: "primary" | "secondary" | "danger" }[]> = {
  active: [
    { label: "Pausar pesquisa", icon: Pause, variant: "secondary" },
    { label: "Encerrar pesquisa", icon: Clock, variant: "danger" },
  ],
  paused: [
    { label: "Reativar pesquisa", icon: Play, variant: "primary" },
    { label: "Encerrar pesquisa", icon: Clock, variant: "danger" },
  ],
  draft: [
    { label: "Publicar pesquisa", icon: Broadcast, variant: "primary" },
  ],
  scheduled: [
    { label: "Cancelar agendamento", icon: Trash, variant: "danger" },
  ],
  closed: [
    { label: "Reabrir pesquisa", icon: Play, variant: "secondary" },
  ],
  archived: [],
};

const STATUS_MAP: Record<string, { label: string; color: "success" | "warning" | "caramel" | "wine" | "neutral" }> = {
  active: { label: "Ativa", color: "success" },
  paused: { label: "Pausada", color: "warning" },
  draft: { label: "Rascunho", color: "caramel" },
  scheduled: { label: "Agendada", color: "wine" },
  closed: { label: "Encerrada", color: "neutral" },
  archived: { label: "Arquivada", color: "neutral" },
};

/* ——— Component ——— */

interface SettingsTabProps {
  data: SurveyResultData;
}

export function SettingsTab({ data }: SettingsTabProps) {
  const [startPeriod = "", endPeriod = ""] = (data.period ?? "").split(" – ");

  const [startDate, setStartDate] = useState<CalendarDate | null>(parseSimpleDate(startPeriod));
  const [endDate, setEndDate] = useState<CalendarDate | null>(parseSimpleDate(endPeriod));
  const [applicationMode, setApplicationMode] = useState<"single" | "recurring">("single");
  const [recurrence, setRecurrence] = useState("monthly");
  const [recurrenceDay, setRecurrenceDay] = useState("monday");
  const [deliveryInApp, setDeliveryInApp] = useState(true);
  const [deliveryEmail, setDeliveryEmail] = useState(true);
  const [deliverySlack, setDeliverySlack] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(true);
  const [aiBiasDetection, setAiBiasDetection] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState("3_days");
  const [reminderMessage, setReminderMessage] = useState(
    "Olá! Sua pesquisa ainda está pendente. Reserve alguns minutos para responder.",
  );
  const [visibility, setVisibility] = useState("managers_hr");
  const [detailLevel, setDetailLevel] = useState("aggregated");
  const [autoPublish, setAutoPublish] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [minGroupSize, setMinGroupSize] = useState("5");

  const surveyLink = `https://app.bud.com.br/s/${data.surveyId}`;
  const statusActions = STATUS_ACTIONS[data.status] ?? [];
  const statusConfig = STATUS_MAP[data.status] ?? STATUS_MAP.archived!;

  function handleSave() {
    toast.success("Configurações salvas com sucesso");
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(surveyLink);
    toast.success("Link copiado para a área de transferência");
  }

  return (
    <div className={styles.tab}>

      {/* ——— GERAL ——— */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Geral</h3>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Status da pesquisa</span>
          <div className={styles.statusRow}>
            <Badge color={statusConfig.color} size="md">{statusConfig.label}</Badge>
            {statusActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                size="sm"
                leftIcon={action.icon}
                onClick={() => toast.success(action.label)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Link da pesquisa</span>
          <div className={styles.linkRow}>
            <Input size="md" value={surveyLink} readOnly />
            <Button variant="secondary" size="md" leftIcon={Copy} onClick={handleCopyLink}>
              Copiar
            </Button>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Período</span>
          <div className={styles.formRow}>
            <DatePicker label="Início" mode="single" value={startDate} onChange={setStartDate} size="md" />
            <DatePicker label="Encerramento" mode="single" value={endDate} onChange={setEndDate} size="md" />
          </div>
          {data.status === "active" && (
            <Alert variant="info" title="Pesquisa em andamento">
              Alterar as datas notificará os participantes.
            </Alert>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Modo de aplicação</span>
          <div className={styles.radioGroup}>
            <Radio
              name="applicationMode"
              label="Coleta única"
              description="Aplicar uma vez no período definido"
              checked={applicationMode === "single"}
              onChange={() => setApplicationMode("single")}
            />
            <Radio
              name="applicationMode"
              label="Recorrente"
              description="Aplicar na frequência definida"
              checked={applicationMode === "recurring"}
              onChange={() => setApplicationMode("recurring")}
            />
          </div>
          {applicationMode === "recurring" && (
            <div className={styles.formRow}>
              <Select
                label="Frequência"
                options={[
                  { value: "weekly", label: "Semanal" },
                  { value: "biweekly", label: "Quinzenal" },
                  { value: "monthly", label: "Mensal" },
                  { value: "quarterly", label: "Trimestral" },
                ]}
                value={recurrence}
                onChange={(v: string | undefined) => setRecurrence(v ?? "monthly")}
                size="md"
              />
              <Select
                label="Dia de aplicação"
                options={[
                  { value: "monday", label: "Segunda-feira" },
                  { value: "tuesday", label: "Terça-feira" },
                  { value: "wednesday", label: "Quarta-feira" },
                  { value: "thursday", label: "Quinta-feira" },
                  { value: "friday", label: "Sexta-feira" },
                ]}
                value={recurrenceDay}
                onChange={(v: string | undefined) => setRecurrenceDay(v ?? "monday")}
                size="md"
              />
            </div>
          )}
        </div>
      </section>

      {/* ——— COLETA E ENTREGA ——— */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Coleta e entrega</h3>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Canais de entrega</span>
          <div className={styles.channelsRow}>
            <Checkbox label="In-App" checked={deliveryInApp} onChange={() => setDeliveryInApp(!deliveryInApp)} />
            <Checkbox label="E-mail" checked={deliveryEmail} onChange={() => setDeliveryEmail(!deliveryEmail)} />
            <Checkbox label="Slack" checked={deliverySlack} onChange={() => setDeliverySlack(!deliverySlack)} />
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Lembretes automáticos</span>
          <Toggle
            label="Enviar lembretes"
            description="Notificar respondentes pendentes"
            checked={reminderEnabled}
            onChange={() => setReminderEnabled(!reminderEnabled)}
          />
          {reminderEnabled && (
            <>
              <Select
                label="Frequência"
                options={[
                  { value: "daily", label: "Diariamente" },
                  { value: "2_days", label: "A cada 2 dias" },
                  { value: "3_days", label: "A cada 3 dias" },
                  { value: "weekly", label: "Semanalmente" },
                ]}
                value={reminderFrequency}
                onChange={(v: string | undefined) => setReminderFrequency(v ?? "3_days")}
                size="md"
              />
              <Textarea
                label="Mensagem do lembrete"
                value={reminderMessage}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReminderMessage(e.target.value)}
                rows={3}
              />
              <div>
                <Button variant="secondary" size="sm" leftIcon={EnvelopeSimple}>
                  Enviar lembrete agora
                </Button>
              </div>
            </>
          )}
        </div>

        <div className={styles.divider} />

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Anonimato e privacidade</span>
          <Toggle
            label="Respostas anônimas"
            description="Os respondentes não serão identificados nos resultados"
            checked={anonymous}
            onChange={() => setAnonymous(!anonymous)}
          />
          <Select
            label="Tamanho mínimo do grupo"
            options={[
              { value: "3", label: "3 respondentes" },
              { value: "5", label: "5 respondentes (recomendado LGPD)" },
              { value: "10", label: "10 respondentes" },
            ]}
            value={minGroupSize}
            onChange={(v: string | undefined) => setMinGroupSize(v ?? "5")}
            size="md"
          />
          {anonymous && (
            <Alert variant="success" title="Anonimato ativo">
              Resultados com menos de {minGroupSize} respondentes serão agregados.
            </Alert>
          )}
        </div>
      </section>

      {/* ——— ATRIBUIÇÃO DE PARES (ciclo only) ——— */}
      {data.surveyCategory === "ciclo" && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Atribuição de pares</h3>

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Modelo de atribuição</span>
            <div className={styles.peerAssignmentInfo}>
              <Badge color="neutral" size="md">
                {data.peerNominationSession?.peerAssignmentMode === "employee_nominates"
                  ? "Colaborador nomeia"
                  : data.peerNominationSession?.peerAssignmentMode === "manager_assigns"
                    ? "Gestor define"
                    : data.peerNominationSession?.peerAssignmentMode === "centralized"
                      ? "RH centralizado"
                      : "Não configurado"}
              </Badge>
              <span className={styles.peerAssignmentDesc}>
                {data.peerNominationSession?.peerAssignmentMode === "employee_nominates"
                  ? "Colaborador nomeia → Gestor aprova → RH supervisiona"
                  : data.peerNominationSession?.peerAssignmentMode === "manager_assigns"
                    ? "Gestor define pares → RH supervisiona"
                    : data.peerNominationSession?.peerAssignmentMode === "centralized"
                      ? "RH definiu todos os pares no lançamento"
                      : "Gestor avalia diretamente o colaborador"}
              </span>
            </div>
          </div>

          {data.peerNominationSession && (
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Status da nomeação</span>
              <div className={styles.peerSettingsGrid}>
                <div className={styles.peerSettingItem}>
                  <span className={styles.peerSettingLabel}>Fase atual</span>
                  <Badge
                    color={data.peerNominationSession.phase === "closed" ? "neutral" : data.peerNominationSession.phase === "in_evaluation" ? "success" : "warning"}
                    size="sm"
                  >
                    {data.peerNominationSession.phase === "nomination" ? "Nomeação"
                      : data.peerNominationSession.phase === "approval" ? "Aprovação"
                      : data.peerNominationSession.phase === "in_evaluation" ? "Em avaliação"
                      : "Encerrado"}
                  </Badge>
                </div>
                <div className={styles.peerSettingItem}>
                  <span className={styles.peerSettingLabel}>Avaliados cobertos</span>
                  <span className={styles.peerSettingValue}>{data.peerNominationSession.evaluateesWithNominations}/{data.peerNominationSession.totalEvaluatees}</span>
                </div>
                <div className={styles.peerSettingItem}>
                  <span className={styles.peerSettingLabel}>Nomeações totais</span>
                  <span className={styles.peerSettingValue}>{data.peerNominationSession.nominations.length}</span>
                </div>
                <div className={styles.peerSettingItem}>
                  <span className={styles.peerSettingLabel}>Aprovadas</span>
                  <span className={styles.peerSettingValue}>{data.peerNominationSession.nominations.filter((n) => n.status === "approved" || n.status === "overridden").length}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ——— RESULTADOS E IA ——— */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Resultados e IA</h3>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Inteligência Artificial</span>
          <Toggle
            label="Análise de IA"
            description="Gerar insights automaticamente a partir das respostas"
            checked={aiAnalysis}
            onChange={() => setAiAnalysis(!aiAnalysis)}
          />
          <Toggle
            label="Detecção de viés"
            description="Identificar padrões de viés nas respostas"
            checked={aiBiasDetection}
            onChange={() => setAiBiasDetection(!aiBiasDetection)}
          />
        </div>

        <div className={styles.divider} />

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Publicação dos resultados</span>
          <div className={styles.formRow}>
            <Select
              label="Visibilidade"
              options={[
                { value: "hr_only", label: "Apenas RH" },
                { value: "managers_hr", label: "Gestores + RH" },
                { value: "all", label: "Todos os participantes" },
              ]}
              value={visibility}
              onChange={(v: string | undefined) => setVisibility(v ?? "managers_hr")}
              size="md"
            />
            <Select
              label="Nível de detalhe"
              options={[
                { value: "aggregated", label: "Apenas agregados" },
                { value: "by_department", label: "Por departamento" },
                { value: "by_team", label: "Por time" },
              ]}
              value={detailLevel}
              onChange={(v: string | undefined) => setDetailLevel(v ?? "aggregated")}
              size="md"
            />
          </div>
          <Toggle
            label="Publicar ao encerrar"
            description="Publicar resultados automaticamente"
            checked={autoPublish}
            onChange={() => setAutoPublish(!autoPublish)}
          />
          <div className={styles.publishActions}>
            <Button variant="secondary" size="sm" leftIcon={Eye}>Pré-visualizar</Button>
            <Button variant="primary" size="sm" leftIcon={Broadcast}>Publicar</Button>
          </div>
        </div>
      </section>

      {/* Save bar */}
      <div className={styles.saveBar}>
        <Button variant="primary" size="md" onClick={handleSave}>Salvar configurações</Button>
      </div>
    </div>
  );
}

/* ——— Danger zone (rendered outside main card) ——— */

export function SettingsDangerZone() {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card padding="md">
        <CardBody>
          <h3 className={`${styles.sectionTitle} ${styles.sectionTitleDanger}`}>Zona de perigo</h3>
          <div className={styles.dangerSection}>
            <div className={styles.dangerItem}>
              <div className={styles.dangerText}>
                <span className={styles.dangerTitle}>Arquivar pesquisa</span>
                <span className={styles.dangerDesc}>Movida para o arquivo. Resultados preservados.</span>
              </div>
              <Button variant="secondary" size="md" onClick={() => toast.warning("Pesquisa arquivada")}>
                Arquivar
              </Button>
            </div>
            <div className={styles.dangerItem}>
              <div className={styles.dangerText}>
                <span className={styles.dangerTitle}>Excluir pesquisa</span>
                <span className={styles.dangerDesc}>Irreversível. Todos os dados serão perdidos.</span>
              </div>
              <Button variant="danger" size="md" leftIcon={Trash} onClick={() => setDeleteOpen(true)}>
                Excluir
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} size="sm">
        <ModalHeader title="Excluir pesquisa" onClose={() => setDeleteOpen(false)} />
        <ModalBody>
          <p className={styles.confirmText}>
            Tem certeza que deseja excluir esta pesquisa? Esta ação é <strong>irreversível</strong> e todos os dados e resultados serão perdidos.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="md" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button variant="danger" size="md" leftIcon={Trash} onClick={() => { setDeleteOpen(false); toast.error("Ação não disponível no modo demonstração"); }}>
            Excluir pesquisa
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

/* ——— Helpers ——— */

function parseSimpleDate(str: string): CalendarDate | null {
  if (!str) return null;
  const trimmed = str.trim();
  const [dayPart = "", monthPart = "", yearPart = ""] = trimmed.split("/");
  if (!dayPart || !monthPart || !yearPart) return null;
  const day = parseInt(dayPart, 10);
  const month = parseInt(monthPart, 10);
  const year = parseInt(yearPart, 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return { year, month, day };
}
