// ─── CollaboratorProfileModal ─────────────────────────────────────────────────
// Perfil resumido do colaborador para o gestor.
//
// Storytelling:
//   1. QUEM  — header: nome, cargo, status de saúde
//   2. VISUAL — avatar + tendência
//   3. SCORES — visão geral com tooltips explicativos
//   4. POR QUÊ — alertas em Accordion (expandível, dá ênfase visual)
//   5. DETALHES — engajamento (hábitos) e missões (indicadores)
//   6. AÇÃO — "Ver missões" leva direto para a página de missões

import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useConfigData } from "@/contexts/ConfigDataContext";
import { useDragToClose } from "@/hooks/useDragToClose";
import {
  TrendUp,
  TrendDown,
  ArrowRight,
  Lightning,
  CheckCircle,
  Warning,
  ClockCountdown,
  ListChecks,
  Target,
  ArrowSquareOut,
  Info,
  Smiley,
  SmileyMeh,
  SmileySad,
  Gauge,
  Timer,
  ClipboardText,
  CalendarBlank,
  CaretDown,
  CaretRight,
  Plus,
  Check,
} from "@phosphor-icons/react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
  Avatar,
  GoalProgressBar,
  Tooltip,
  Accordion,
  AccordionItem,
  FilterDropdown,
  DatePicker,
} from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import type { UserEngagementSummary, HealthStatus, TrendDirection } from "@/types/engagement";
import styles from "./CollaboratorProfileModal.module.css";

// ── Lookup tables ──────────────────────────────────────────────────────────────

const HEALTH_BADGE: Record<HealthStatus, { color: "success" | "warning" | "error"; label: string }> = {
  healthy:   { color: "success", label: "Bem"     },
  attention: { color: "warning", label: "Atenção" },
  critical:  { color: "error",   label: "Crítico" },
};

const TREND_LABEL: Record<TrendDirection, string> = {
  up:     "Em alta",
  down:   "Em queda",
  stable: "Estável",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high:          "Alta",
  medium:        "Média",
  low:           "Baixa",
  barrier:       "Bloqueado",
  deprioritized: "Despriorizado",
};

const WORKLOAD_LABEL: Record<string, string> = {
  low:      "Leve",
  normal:   "Normal",
  high:     "Alta",
  overload: "Sobrecarga",
};

// ── Helpers de pulse ───────────────────────────────────────────────────────────

function getSentimentIcon(v: number | null) {
  if (!v) return SmileyMeh;
  if (v >= 4) return Smiley;
  if (v >= 3) return SmileyMeh;
  return SmileySad;
}

function formatPulseLabel(sentiment: number, date: string, trend: string | null): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  const daysLabel = days === 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`;
  const trendLabel =
    trend === "improving" ? " · Em alta"
    : trend === "declining" ? " · Em queda"
    : "";
  return `${sentiment}/5 · ${daysLabel}${trendLabel}`;
}

function formatResponseTime(hours: number): string {
  if (hours < 1) return "< 1h em média";
  if (hours < 24) return `~${Math.round(hours)}h em média`;
  const days = Math.round(hours / 24);
  return `~${days} ${days === 1 ? "dia" : "dias"} em média`;
}

const SCORE_TOOLTIPS = {
  geral:        "Média ponderada 50% performance + 50% engajamento. Reflete a saúde geral do colaborador no ciclo.",
  performance:  "60% missões (progresso dos indicadores) + 40% participação em pesquisas. Mede entrega de resultados.",
  engajamento:  "50% check-ins (streak e frequência) + 30% participação em pesquisas + 20% acessos. Mede uso ativo da plataforma.",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreStatus(v: number): "on-track" | "attention" | "off-track" {
  return v >= 70 ? "on-track" : v >= 40 ? "attention" : "off-track";
}

function lastCheckInLabel(days: number): string {
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return `Há ${days} dias`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TrendPill({ trend }: { trend: TrendDirection }) {
  const Icon = trend === "up" ? TrendUp : trend === "down" ? TrendDown : ArrowRight;
  return (
    <Tooltip content="Tendência de check-ins nas últimas 4 semanas" placement="top">
      <span className={`${styles.trendPill} ${styles[`trend_${trend}`]}`}>
        <Icon size={12} />
        {TREND_LABEL[trend]}
        <Info size={10} className={styles.trendInfoIcon} />
      </span>
    </Tooltip>
  );
}

interface ScoreCardProps {
  label: string;
  value: number;
  tooltip: string;
  primary?: boolean;
}

function ScoreCard({ label, value, tooltip, primary }: ScoreCardProps) {
  const status = scoreStatus(value);
  const colorClass =
    status === "on-track" ? styles.scoreGood :
    status === "attention" ? styles.scoreWarn :
    styles.scoreBad;

  return (
    <div className={`${styles.scoreCard} ${primary ? styles.scoreCardPrimary : ""}`}>
      <div className={styles.scoreCardHeader}>
        <span className={styles.scoreCardLabel}>{label}</span>
        <Tooltip content={tooltip} placement="top">
          <Info size={12} className={styles.scoreInfoIcon} />
        </Tooltip>
      </div>
      <span className={`${styles.scoreCardValue} ${colorClass}`}>{value}%</span>
      <div className={styles.scoreCardBar}>
        <GoalProgressBar label="" value={value} status={status} />
      </div>
    </div>
  );
}

interface StatRowProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  warn?: boolean;
}

function StatRow({ icon: Icon, label, value, warn }: StatRowProps) {
  return (
    <div className={styles.statRow}>
      <Icon size={14} className={warn ? styles.statIconWarn : styles.statIcon} />
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${warn ? styles.statValueWarn : ""}`}>{value}</span>
    </div>
  );
}

// ── CollaboratorProfileModal ───────────────────────────────────────────────────

interface CollaboratorProfileModalProps {
  member: UserEngagementSummary;
  onClose: () => void;
  /** Optional period to pass to missions page filter */
  period?: { startDate: string | null; endDate: string | null } | null;
}

export function CollaboratorProfileModal({ member, onClose, period }: CollaboratorProfileModalProps) {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const sheetRef = useRef<HTMLDivElement>(null);
  const { habit, performance } = member;
  const badge = HEALTH_BADGE[member.healthStatus];

  // Drag-to-close no mobile
  useDragToClose(sheetRef, onClose, { enabled: isMobile });

  const surveyRate = Math.round(habit.surveyResponseRate * 100);
  const confidenceLabel = performance.avgConfidence
    ? (CONFIDENCE_LABEL[performance.avgConfidence] ?? performance.avgConfidence)
    : "—";

  const hasAlerts = member.alerts.length > 0;

  // ESC fecha o bottom sheet (o Modal do DS já trata ESC internamente)
  useEffect(() => {
    if (!isMobile) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isMobile, onClose]);

  // Título do accordion de alertas com badge de contagem
  const alertsTitle = (
    <span className={styles.alertAccordionTitle}>
      <Warning size={14} className={styles.alertAccordionIcon} />
      Requer atenção
      <Badge color="error" size="sm">{member.alerts.length}</Badge>
    </span>
  );

  // ── Period filter ────────────────────────────────────────────────────────
  const { cycles } = useConfigData();
  const CUSTOM_CYCLE = "__custom__";

  const defaultCycleId = useMemo(() => {
    if (period?.startDate && period?.endDate) {
      const match = cycles.find((c) => c.startDate === period.startDate && c.endDate === period.endDate);
      if (match) return match.id;
      return CUSTOM_CYCLE;
    }
    return cycles.find((c) => c.status === "active")?.id ?? cycles[0]?.id ?? "";
  }, [cycles, period]);

  const [selectedCycleId, setSelectedCycleId] = useState(defaultCycleId);
  const [customRange, setCustomRange] = useState<[CalendarDate | null, CalendarDate | null]>(() => {
    if (defaultCycleId === CUSTOM_CYCLE && period?.startDate && period?.endDate) {
      const parse = (iso: string): CalendarDate => {
        const [y, m, d] = iso.split("-").map(Number);
        return { year: y!, month: m!, day: d! };
      };
      return [parse(period.startDate), parse(period.endDate)];
    }
    return [null, null];
  });
  const periodBtnRef = useRef<HTMLButtonElement>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodCustomBtnRef = useRef<HTMLButtonElement>(null);
  const [periodCustomOpen, setPeriodCustomOpen] = useState(false);

  function selectCycle(id: string) {
    setSelectedCycleId(id);
    if (id !== CUSTOM_CYCLE) setCustomRange([null, null]);
    setPeriodOpen(false);
    setPeriodCustomOpen(false);
  }

  const fmtDate = (d: CalendarDate) =>
    `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}/${d.year}`;

  const periodLabel = useMemo(() => {
    if (selectedCycleId === CUSTOM_CYCLE) {
      const [s, e] = customRange;
      if (s && e) return `${fmtDate(s)} – ${fmtDate(e)}`;
      return "Período personalizado";
    }
    return cycles.find((c) => c.id === selectedCycleId)?.name ?? "Período";
  }, [selectedCycleId, customRange, cycles]);

  // ── Conteúdo reutilizável nos dois layouts ────────────────────────────────
  const bodyContent = (
    <>
      {/* ── PERÍODO ───────────────────────────────────────────────────── */}
      <div className={styles.periodRow}>
        <div className={styles.filterItem}>
          <Button
            ref={periodBtnRef}
            variant="secondary"
            size="sm"
            leftIcon={CalendarBlank}
            rightIcon={CaretDown}
            onClick={() => { setPeriodOpen((v) => !v); setPeriodCustomOpen(false); }}
          >
            {periodLabel}
          </Button>
          <FilterDropdown
            open={periodOpen}
            onClose={() => { setPeriodOpen(false); setPeriodCustomOpen(false); }}
            anchorRef={periodBtnRef}
            noOverlay
          >
            <div className={styles.filterDropdownBody}>
              {cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  className={`${styles.filterDropdownItem} ${selectedCycleId === cycle.id ? styles.filterDropdownItemActive : ""}`}
                  onClick={() => selectCycle(cycle.id)}
                >
                  <span>{cycle.name}</span>
                  {selectedCycleId === cycle.id && <Check size={14} className={styles.checkIcon} />}
                </button>
              ))}
            </div>
            <div className={styles.periodDropdownFooter}>
              <button
                ref={periodCustomBtnRef}
                type="button"
                className={`${styles.filterDropdownItem} ${selectedCycleId === CUSTOM_CYCLE ? styles.filterDropdownItemActive : ""}`}
                onClick={() => setPeriodCustomOpen((v) => !v)}
              >
                <Plus size={14} />
                <span>Período personalizado</span>
                <CaretRight size={12} className={styles.moreMenuArrow} />
              </button>
            </div>
          </FilterDropdown>
          <FilterDropdown
            open={periodOpen && periodCustomOpen}
            onClose={() => setPeriodCustomOpen(false)}
            anchorRef={periodCustomBtnRef}
            placement="right-start"
            noOverlay
          >
            <div className={styles.periodCustomPopover}>
              <DatePicker
                mode="range"
                value={customRange}
                onChange={(val) => {
                  const range = val as [CalendarDate | null, CalendarDate | null];
                  setCustomRange(range);
                  if (range[0] && range[1]) {
                    setSelectedCycleId(CUSTOM_CYCLE);
                    setPeriodOpen(false);
                    setPeriodCustomOpen(false);
                  }
                }}
              />
            </div>
          </FilterDropdown>
        </div>
      </div>

      {/* ── 3. SCORES ─────────────────────────────────────────────────── */}
      <div className={styles.scoreGrid}>
        <ScoreCard label="Score geral" value={member.overallScore} tooltip={SCORE_TOOLTIPS.geral} primary />
        <ScoreCard label="Performance" value={member.performanceScore} tooltip={SCORE_TOOLTIPS.performance} />
        <ScoreCard label="Engajamento" value={member.engagementScore} tooltip={SCORE_TOOLTIPS.engajamento} />
      </div>

      {/* ── 4. ALERTAS ────────────────────────────────────────────────── */}
      {hasAlerts && (
        <div className={styles.alertsAccordion}>
          <Accordion header>
            <AccordionItem title={alertsTitle} defaultOpen icon={undefined}>
              <ul className={styles.alertList}>
                {member.alerts.map((a, i) => (
                  <li key={i} className={styles.alertListItem}>
                    <Warning size={12} className={styles.alertListIcon} />
                    {a}
                  </li>
                ))}
              </ul>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* ── 5a. PESQUISAS ─────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Pesquisas</h4>
        <div className={styles.statList}>
          <StatRow
            icon={getSentimentIcon(habit.lastPulseSentiment)}
            label="Último pulse"
            value={
              habit.lastPulseSentiment && habit.lastPulseDate
                ? formatPulseLabel(habit.lastPulseSentiment, habit.lastPulseDate, habit.pulseSentimentTrend)
                : "Sem dados recentes"
            }
            warn={habit.lastPulseSentiment !== null && habit.lastPulseSentiment < 3}
          />
          {habit.lastPulseWorkload && (
            <StatRow
              icon={Gauge}
              label="Carga de trabalho"
              value={WORKLOAD_LABEL[habit.lastPulseWorkload] ?? habit.lastPulseWorkload}
              warn={habit.lastPulseWorkload === "high" || habit.lastPulseWorkload === "overload"}
            />
          )}
          {performance.avgSurveyResponseTimeHours !== null && (
            <StatRow
              icon={Timer}
              label="Velocidade de resposta"
              value={formatResponseTime(performance.avgSurveyResponseTimeHours)}
            />
          )}
          <StatRow
            icon={ListChecks}
            label="Participação"
            value={`${habit.surveysRespondedLast30d} de ${habit.surveysTotalLast30d} respondidas`}
            warn={surveyRate < 50}
          />
          {habit.pendingSurveysCount > 0 && (
            <StatRow icon={Warning} label="Pesquisas pendentes" value={habit.pendingSurveysCount} warn />
          )}
        </div>
      </div>

      {/* ── 5b. ENGAJAMENTO ───────────────────────────────────────────── */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Engajamento</h4>
        <div className={styles.statList}>
          <StatRow icon={Lightning} label="Streak de check-ins" value={`${habit.checkInStreak} ${habit.checkInStreak === 1 ? "semana" : "semanas"}`} />
          <StatRow icon={ClockCountdown} label="Último check-in" value={lastCheckInLabel(habit.daysSinceLastCheckIn)} warn={habit.daysSinceLastCheckIn > 7} />
        </div>
      </div>

      {/* ── 5b. MISSÕES ───────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Missões</h4>
        <div className={styles.statList}>
          <StatRow icon={Target} label="Indicadores ativos" value={performance.activeKRsCount} warn={performance.activeKRsCount === 0} />
          <StatRow icon={CheckCircle} label="Indicadores concluídos" value={performance.completedKRsCount} />
          <StatRow icon={ArrowRight} label="Progresso médio" value={`${Math.round(performance.avgProgress)}%`} warn={performance.avgProgress < 40} />
          <StatRow icon={Lightning} label="Confiança média" value={confidenceLabel} warn={performance.avgConfidence === "low" || performance.avgConfidence === "barrier"} />
        </div>
        <div className={styles.progressBarRow}>
          <GoalProgressBar
            label={`Progresso médio dos indicadores: ${Math.round(performance.avgProgress)}%`}
            value={performance.avgProgress}
            status={scoreStatus(performance.avgProgress)}
          />
        </div>
      </div>
    </>
  );

  const handleViewMissions = () => {
    // Use the period from the modal's filter, not the original prop
    const toIso = (d: CalendarDate) =>
      `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
    let activePeriod: { startDate: string; endDate: string } | null = null;
    if (selectedCycleId === CUSTOM_CYCLE) {
      const [s, e] = customRange;
      if (s && e) activePeriod = { startDate: toIso(s), endDate: toIso(e) };
    } else {
      const cycle = cycles.find((c) => c.id === selectedCycleId);
      if (cycle) activePeriod = { startDate: cycle.startDate, endDate: cycle.endDate };
    }
    navigate(`/missions?filter=${encodeURIComponent(member.name)}`, {
      state: {
        filterOwnerUserId: member.userId,
        filterSupporterUserId: member.userId,
        ...(activePeriod ? { filterPeriod: activePeriod } : {}),
      },
    });
    onClose();
  };

  const handleViewSurveys = () => {
    navigate("/surveys", {
      state: { filterRespondentId: member.userId, filterRespondentName: member.name },
    });
    onClose();
  };

  // ── Mobile: bottom sheet ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div
          className={styles.sheetBackdrop}
          onClick={onClose}
          aria-hidden
        />
        <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal aria-label={`Perfil de ${member.name}`}>
          {/* Drag handle + header */}
          <div className={styles.sheetHeader}>
            <Avatar size="sm" initials={member.initials} src={member.avatarUrl ?? undefined} />
            <div className={styles.sheetInfo}>
              <span className={styles.sheetName}>{member.name}</span>
              <div className={styles.sheetMeta}>
                {member.jobTitle && <span className={styles.sheetJob}>{member.jobTitle}</span>}
                <TrendPill trend={member.trend} />
              </div>
            </div>
            <div className={styles.sheetHeaderActions}>
              <Badge color={badge.color} size="sm">{badge.label}</Badge>
              <Button variant="secondary" size="sm" onClick={onClose} aria-label="Fechar">
                ✕
              </Button>
            </div>
          </div>
          <div className={styles.sheetBody}>{bodyContent}</div>
          <div className={styles.sheetFooter}>
            <Button variant="secondary" size="md" onClick={onClose}>Fechar</Button>
            <div className={styles.footerActions}>
              <Button variant="secondary" size="md" rightIcon={ClipboardText} onClick={handleViewSurveys}>Ver pesquisas</Button>
              <Button variant="primary" size="md" rightIcon={ArrowSquareOut} onClick={handleViewMissions}>Ver missões</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Desktop: modal DS ─────────────────────────────────────────────────────

  const headerTitle = (
    <span className={styles.headerIdentity}>
      <Avatar size="md" initials={member.initials} src={member.avatarUrl ?? undefined} />
      {member.name}
    </span>
  );

  const headerDescription = member.jobTitle ? (
    <span className={styles.headerDescription}>
      <span>{member.jobTitle}</span>
      <TrendPill trend={member.trend} />
    </span>
  ) : (
    <TrendPill trend={member.trend} />
  );

  return (
    <Modal open onClose={onClose} size="lg">
      {/* ── 1. QUEM ──────────────────────────────────────────────────── */}
      <ModalHeader title={headerTitle} description={headerDescription} onClose={onClose}>
        <Badge color={badge.color} size="sm">{badge.label}</Badge>
      </ModalHeader>

      <ModalBody>{bodyContent}</ModalBody>

      {/* ── 6. AÇÃO ──────────────────────────────────────────────────── */}
      <ModalFooter align="between">
        <Button variant="secondary" size="md" onClick={onClose}>Fechar</Button>
        <div className={styles.footerActions}>
          <Button variant="secondary" size="md" rightIcon={ClipboardText} onClick={handleViewSurveys}>Ver pesquisas</Button>
          <Button variant="primary" size="md" rightIcon={ArrowSquareOut} onClick={handleViewMissions}>Ver missões</Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
