import { useMemo } from "react";
import { useWizard } from "../SurveyWizardContext";
import { needsPeerAssignment } from "../wizardReducer";
import { getTypeLabel } from "../../templates/surveyTemplates";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { useConfigData } from "@/contexts/ConfigDataContext";
import { formatDateBR } from "@/lib/date-format";
import {
  Card,
  CardBody,
  Badge,
  Button,
  Alert,
  DatePicker,
  ChoiceBox,
  ChoiceBoxGroup,
  toast,
} from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import {
  ClipboardText,
  Users,
  ArrowRight,
  Sparkle,
  Eye,
  Megaphone,
} from "@phosphor-icons/react";
import { CYCLE_PHASE_LABELS, ALL_CYCLE_PHASES, NOMINATION_PHASES } from "../../utils/cyclePhaseConfig";
import styles from "./StepReview.module.css";

/* ——— Helpers ——— */

function isoToCalendarDate(iso: string | null): CalendarDate | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function calendarDateToIso(cd: CalendarDate): string {
  return new Date(cd.year, cd.month - 1, cd.day).toISOString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return formatDateBR(iso) || "—";
}

const SCOPE_LABELS: Record<string, string> = { company: "Toda a empresa", department: "Departamento", team: "Time", individual: "Individual" };
const RECURRENCE_LABELS: Record<string, string> = { weekly: "Semanal", biweekly: "Quinzenal", monthly: "Mensal", quarterly: "Trimestral" };
const REMINDER_LABELS: Record<string, string> = { daily: "Diário", every_2_days: "A cada 2 dias", weekly: "Semanal" };
const PEER_MODE_LABELS: Record<string, string> = { employee_nominates: "Colaborador nomeia → Gestor aprova", manager_assigns: "Gestor define → RH supervisiona", centralized: "RH definiu no lançamento" };

const CYCLE_PHASE_COLORS: Record<string, string> = {
  self_evaluation: "var(--color-orange-500)",
  peer_nomination: "var(--color-wine-500)",
  peer_approval: "var(--color-wine-500)",
  peer_evaluation: "var(--color-green-600)",
  manager_evaluation: "var(--color-caramel-600)",
  calibration: "var(--color-neutral-600)",
  feedback: "var(--color-green-600)",
};

/* ——— Component ——— */

export function StepReview() {
  const { state, dispatch, isCiclo, participantCount } = useWizard();
  const { resolveUserId, getUserDisplayName } = usePeopleData();
  const { resolveTagId, getTagById, resolveCycleId, getCycleById } = useConfigData();

  const showLgpdWarning = state.isAnonymous && participantCount < state.lgpdMinGroupSize && participantCount > 0;
  const hasPeers = needsPeerAssignment(state);

  const channels = useMemo(() => {
    const ch: string[] = [];
    if (state.deliveryInApp) ch.push("In-App");
    if (state.deliveryEmail) ch.push("E-mail");
    if (state.deliverySlack) ch.push("Slack");
    return ch.join(", ") || "—";
  }, [state.deliveryInApp, state.deliveryEmail, state.deliverySlack]);

  const perspectivesSummary = useMemo(() => {
    if (!isCiclo) return null;
    const labels: Record<string, string> = { self: "Autoavaliação", manager: "Gestor", peers: "Pares", reports: "Liderados" };
    return state.perspectives.filter((p) => p.enabled).map((p) => labels[p.perspective] ?? p.perspective);
  }, [isCiclo, state.perspectives]);

  const ownersSummary = useMemo(() => {
    if (state.ownerIds.length === 0) return "—";
    return state.ownerIds.map((id) => getUserDisplayName(resolveUserId(id))).join(", ");
  }, [state.ownerIds, getUserDisplayName, resolveUserId]);

  const cycleSummary = useMemo(() => {
    if (!state.cycleId) return null;
    return getCycleById(resolveCycleId(state.cycleId))?.name ?? null;
  }, [state.cycleId, resolveCycleId, getCycleById]);

  const tagsSummary = useMemo(() => {
    if (state.tagIds.length === 0) return null;
    return state.tagIds.map((id) => getTagById(resolveTagId(id))?.name ?? id).join(", ");
  }, [state.tagIds, resolveTagId, getTagById]);

  // Visible cycle phases (hide nomination if centralized)
  const visiblePhases = useMemo(() => {
    if (!isCiclo) return [];
    return ALL_CYCLE_PHASES.filter((phase) => {
      if (NOMINATION_PHASES.has(phase) && (!hasPeers || state.peerAssignmentMode === "centralized")) return false;
      return true;
    });
  }, [isCiclo, hasPeers, state.peerAssignmentMode]);

  const firstQuestion = state.questions[0] ?? null;

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.heading}>Revisar e lançar</h2>
      <p className={styles.subheading}>
        Confira o resumo antes de {state.launchOption === "scheduled" ? "agendar" : "lançar"} a pesquisa
      </p>

      {/* ——— 1. IDENTIDADE DA PESQUISA ——— */}
      <Card padding="md" shadow={false}>
        <CardBody>
          <div className={styles.sectionHeader}>
            <ClipboardText size={20} color="var(--color-orange-500)" />
            <h3 className={styles.sectionTitle}>Sobre a pesquisa</h3>
          </div>
          <div className={styles.detailGrid}>
            <Detail label="Tipo">
              <Badge color={state.category === "ciclo" ? "wine" : "orange"} size="sm">
                {state.type ? getTypeLabel(state.type) : "—"}
              </Badge>
            </Detail>
            <Detail label="Nome">{state.name || "—"}</Detail>
            {state.description && <Detail label="Descrição">{state.description}</Detail>}
            <Detail label="Responsáveis">{ownersSummary}</Detail>
            {cycleSummary && <Detail label="Ciclo">{cycleSummary}</Detail>}
            {tagsSummary && <Detail label="Tags">{tagsSummary}</Detail>}
            <Detail label="Perguntas">{state.questions.length} perguntas{state.sections.length > 0 ? ` em ${state.sections.length} seções` : ""}</Detail>
          </div>
        </CardBody>
      </Card>

      {/* ——— 2. QUEM PARTICIPA ——— */}
      <Card padding="md" shadow={false}>
        <CardBody>
          <div className={styles.sectionHeader}>
            <Users size={20} color="var(--color-green-600)" />
            <h3 className={styles.sectionTitle}>Quem participa</h3>
          </div>
          <div className={styles.detailGrid}>
            <Detail label="Escopo">{SCOPE_LABELS[state.scope.scopeType] ?? state.scope.scopeType}</Detail>
            <Detail label="Participantes estimados">~{participantCount} pessoas</Detail>
            <Detail label="Anonimato">{state.isAnonymous ? "Anônimo" : "Identificado"}</Detail>
            {isCiclo && perspectivesSummary && (
              <Detail label="Perspectivas">
                <div className={styles.badgeList}>
                  {perspectivesSummary.map((p) => <Badge key={p} color="neutral" size="sm">{p}</Badge>)}
                </div>
              </Detail>
            )}
            {hasPeers && (
              <Detail label="Atribuição de pares">{PEER_MODE_LABELS[state.peerAssignmentMode]}</Detail>
            )}
            {hasPeers && state.peerAssignmentMode === "centralized" && state.peerAssignments.length > 0 && (
              <Detail label="Pares atribuídos">
                {state.peerAssignments.filter((pa) => pa.assignedPeerIds.length > 0).length} de {state.peerAssignments.length} avaliados
              </Detail>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ——— 3. FLUXO DE APLICAÇÃO ——— */}
      <Card padding="md" shadow={false}>
        <CardBody>
          <div className={styles.sectionHeader}>
            <ArrowRight size={20} color="var(--color-wine-500)" />
            <h3 className={styles.sectionTitle}>Fluxo de aplicação</h3>
          </div>

          {/* Period — always shown */}
          <div className={styles.detailGrid}>
            <Detail label="Período geral">{fmtDate(state.startDate)} — {fmtDate(state.endDate)}</Detail>
            {state.recurrence && <Detail label="Recorrência">{RECURRENCE_LABELS[state.recurrence] ?? state.recurrence}</Detail>}
            <Detail label="Canais de entrega">{channels}</Detail>
            <Detail label="Lembretes">
              {state.reminderEnabled
                ? state.reminderFrequency ? REMINDER_LABELS[state.reminderFrequency] : "Ativados"
                : "Desativados"}
            </Detail>
          </div>

          {/* Timeline visual for ciclo */}
          {isCiclo && visiblePhases.length > 0 && (
            <>
              <div className={styles.timelineTitle}>Fases do ciclo</div>
              <div className={styles.timeline}>
                {visiblePhases.map((phase, i) => {
                  const phaseData = state.cyclePhases.find((cp) => cp.phase === phase);
                  return (
                    <div key={phase} className={styles.timelineStep}>
                      <div className={styles.timelineIndicator}>
                        <div className={styles.timelineDot} style={{ backgroundColor: CYCLE_PHASE_COLORS[phase] }}>
                          <span className={styles.timelineNum}>{i + 1}</span>
                        </div>
                        {i < visiblePhases.length - 1 && <div className={styles.timelineLine} />}
                      </div>
                      <div className={styles.timelineContent}>
                        <span className={styles.timelineLabel}>{CYCLE_PHASE_LABELS[phase]}</span>
                        {phaseData?.startDate && phaseData?.endDate ? (
                          <span className={styles.timelineDates}>
                            {fmtDate(phaseData.startDate)} — {fmtDate(phaseData.endDate)}
                          </span>
                        ) : (
                          <span className={styles.timelineDatesEmpty}>Datas não definidas</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* ——— 4. INTELIGÊNCIA ——— */}
      <Card padding="md" shadow={false}>
        <CardBody>
          <div className={styles.sectionHeader}>
            <Sparkle size={20} color="var(--color-orange-500)" />
            <h3 className={styles.sectionTitle}>Inteligência e privacidade</h3>
          </div>
          <div className={styles.detailGrid}>
            <Detail label="Análise de IA">
              <Badge color={state.aiAnalysisEnabled ? "success" : "neutral"} size="sm">
                {state.aiAnalysisEnabled ? "Ativada" : "Desativada"}
              </Badge>
            </Detail>
            {state.aiBiasDetection && (
              <Detail label="Detecção de viés">
                <Badge color="success" size="sm">Ativada</Badge>
              </Detail>
            )}
            <Detail label="Privacidade">
              {state.isAnonymous
                ? `Anônimo (mín. ${state.lgpdMinGroupSize} respondentes por grupo)`
                : "Respostas identificadas"}
            </Detail>
            {hasPeers && state.peerNominationConfig.aiSuggestionsEnabled && (
              <Detail label="Sugestão IA de pares">
                <Badge color="success" size="sm">Ativada</Badge>
              </Detail>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ——— 5. PREVIEW (button only) ——— */}
      {firstQuestion && (
        <div className={styles.previewButtonRow}>
          <Button
            variant="secondary"
            size="md"
            leftIcon={Eye}
            onClick={() => toast.black("Preview em desenvolvimento")}
          >
            Ver prévia da pesquisa
          </Button>
          <span className={styles.previewHint}>
            {state.questions.length} perguntas{state.sections.length > 0 ? ` em ${state.sections.length} seções` : ""}
          </span>
        </div>
      )}

      {/* LGPD warning */}
      {showLgpdWarning && (
        <Alert variant="warning" title="Atenção: grupo pequeno">
          O grupo de participantes (~{participantCount}) é menor que o mínimo recomendado ({state.lgpdMinGroupSize}) para garantir anonimato conforme LGPD.
        </Alert>
      )}

      {/* ——— 6. LANÇAMENTO ——— */}
      <Card padding="md" shadow={false}>
        <CardBody>
          <div className={styles.sectionHeader}>
            <Megaphone size={20} color="var(--color-orange-500)" />
            <h3 className={styles.sectionTitle}>Lançamento</h3>
          </div>
          <div className={styles.launchOptions}>
            <ChoiceBoxGroup
              value={state.launchOption}
              onChange={(val: string | undefined) =>
                dispatch({ type: "SET_LAUNCH_OPTION", payload: (val as "now" | "scheduled") ?? "now" })
              }
            >
              <ChoiceBox value="now" title="Lançar agora" description="A pesquisa será enviada imediatamente para todos os participantes" />
              <ChoiceBox value="scheduled" title="Agendar lançamento" description="Defina uma data futura para o envio automático" />
            </ChoiceBoxGroup>
            {state.launchOption === "scheduled" && (
              <div className={styles.scheduleDatePicker}>
                <DatePicker
                  label="Data do lançamento"
                  mode="single"
                  value={isoToCalendarDate(state.scheduledLaunchAt)}
                  onChange={(cd: CalendarDate | null) =>
                    dispatch({ type: "SET_SCHEDULED_LAUNCH", payload: cd ? calendarDateToIso(cd) : null })
                  }
                />
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ——— Detail row sub-component ——— */

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.detailItem}>
      <dt className={styles.detailLabel}>{label}</dt>
      <dd className={styles.detailValue}>{children}</dd>
    </div>
  );
}
