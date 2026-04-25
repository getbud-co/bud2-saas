// ─── TeamOverviewModule ───────────────────────────────────────────────────────
// Visão geral da saúde do time: filtros de time (multi), pessoas (multi),
// saúde (multi) e período (popover), KPIs de Performance e Engajamento +
// tabela de colaboradores por criticidade.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarBlank,
  CaretDown,
  CaretRight,
  Check,
  Heartbeat,
  Plus,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDivider,
  Checkbox,
  DatePicker,
  FilterDropdown,
} from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTeamOverviewData, type PeriodFilter } from "@/hooks/useTeamOverviewData";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { useCycles } from "@/hooks/use-cycles";
import { EngagementStatsBar } from "./components/EngagementStatsBar";
import { TeamHealthTable } from "./components/TeamHealthTable";
import { CollaboratorProfileModal } from "./components/CollaboratorProfileModal";
import type { HealthStatus, UserEngagementSummary } from "@/types/engagement";
import styles from "./TeamOverviewModule.module.css";

// ── Helpers ────────────────────────────────────────────────────────────────────

const CUSTOM_CYCLE_VALUE = "__custom__";

const HEALTH_OPTIONS: { status: HealthStatus; color: "success" | "warning" | "error"; label: string }[] = [
  { status: "healthy",   color: "success", label: "Bem"     },
  { status: "attention", color: "warning", label: "Atenção" },
  { status: "critical",  color: "error",   label: "Crítico" },
];

function formatCalendarDate(d: CalendarDate): string {
  const mm = String(d.month).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return `${dd}/${mm}/${d.year}`;
}

// ── TeamOverviewModule ─────────────────────────────────────────────────────────

export function TeamOverviewModule() {
  const { teams, currentUserId } = usePeopleData();
  const { data: cycles = [] } = useCycles();

  // ── Team filter (default = teams led by current user) ─────────────────────
  const defaultTeamIds = useMemo(() => {
    const led = teams.filter((t) => t.leaderId === currentUserId).map((t) => t.id);
    return led.length > 0 ? led : teams.length > 0 ? [teams[0]!.id] : [];
  }, [teams, currentUserId]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(defaultTeamIds);
  const teamBtnRef = useRef<HTMLButtonElement>(null);
  const [teamOpen, setTeamOpen] = useState(false);

  function toggleTeam(id: string) {
    setSelectedTeamIds((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((t) => t !== id) : prev
        : [...prev, id],
    );
  }

  const teamLabel = useMemo(() => {
    const sel = teams.filter((t) => selectedTeamIds.includes(t.id));
    if (sel.length === 0) return "Selecionar time";
    if (sel.length === 1) return sel[0]!.name;
    return `${sel.length} times`;
  }, [teams, selectedTeamIds]);

  // ── Period filter (popover com lista de ciclos) ───────────────────────────
  const defaultCycleId = useMemo(
    () => cycles.find((c) => c.status === "active")?.id ?? cycles[0]?.id ?? "",
    [cycles],
  );
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [customRange, setCustomRange] = useState<[CalendarDate | null, CalendarDate | null]>([null, null]);
  const periodBtnRef = useRef<HTMLButtonElement>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodCustomBtnRef = useRef<HTMLButtonElement>(null);
  const [periodCustomOpen, setPeriodCustomOpen] = useState(false);

  useEffect(() => {
    if (!defaultCycleId) return;
    setSelectedCycleId((current) => {
      if (current === CUSTOM_CYCLE_VALUE) return current;
      if (current && cycles.some((cycle) => cycle.id === current)) return current;
      return defaultCycleId;
    });
  }, [cycles, defaultCycleId]);

  function selectCycle(id: string) {
    setSelectedCycleId(id);
    if (id !== CUSTOM_CYCLE_VALUE) setCustomRange([null, null]);
    setPeriodOpen(false);
    setPeriodCustomOpen(false);
  }

  const periodLabel = useMemo(() => {
    if (selectedCycleId === CUSTOM_CYCLE_VALUE) {
      const [s, e] = customRange;
      if (s && e) return `${formatCalendarDate(s)} – ${formatCalendarDate(e)}`;
      return "Período personalizado";
    }
    return cycles.find((c) => c.id === selectedCycleId)?.name ?? "Período";
  }, [selectedCycleId, customRange, cycles]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const activePeriod = useMemo((): PeriodFilter | null => {
    if (selectedCycleId === CUSTOM_CYCLE_VALUE) {
      const [s, e] = customRange;
      if (!s && !e) return null;
      const toIso = (d: CalendarDate) =>
        `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
      return {
        startDate: s ? toIso(s) : null,
        endDate: e ? toIso(e) : null,
      };
    }
    const cycle = cycles.find((c) => c.id === selectedCycleId);
    if (!cycle) return null;
    return { startDate: cycle.start_date, endDate: cycle.end_date };
  }, [selectedCycleId, customRange, cycles]);

  const data = useTeamOverviewData(selectedTeamIds, activePeriod);

  // ── People filter (multi-select de colaboradores) ─────────────────────────
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set());
  const personBtnRef = useRef<HTMLButtonElement>(null);
  const [personOpen, setPersonOpen] = useState(false);

  // Reseta seleção de pessoas ao trocar de time
  useEffect(() => {
    setSelectedPersonIds(new Set());
  }, [selectedTeamIds]);

  function togglePerson(id: string) {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const personLabel = useMemo(() => {
    if (selectedPersonIds.size === 0) return "Colaboradores";
    if (selectedPersonIds.size === 1) {
      const m = data.memberEngagements.find((m) => selectedPersonIds.has(m.userId));
      return m?.name ?? "1 pessoa";
    }
    return `${selectedPersonIds.size} pessoas`;
  }, [selectedPersonIds, data.memberEngagements]);

  // ── Health status filter (Bem / Atenção / Crítico) ────────────────────────
  const [selectedHealthStatuses, setSelectedHealthStatuses] = useState<Set<HealthStatus>>(new Set());
  const healthBtnRef = useRef<HTMLButtonElement>(null);
  const [healthOpen, setHealthOpen] = useState(false);

  function toggleHealth(status: HealthStatus) {
    setSelectedHealthStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const healthLabel = useMemo(() => {
    if (selectedHealthStatuses.size === 0) return "Saúde";
    const labels = [...selectedHealthStatuses].map(
      (s) => HEALTH_OPTIONS.find((o) => o.status === s)?.label ?? s,
    );
    if (labels.length === 1) return labels[0]!;
    return `${labels.length} status`;
  }, [selectedHealthStatuses]);

  // ── Membros filtrados (people + health) ───────────────────────────────────
  const filteredMembers = useMemo((): UserEngagementSummary[] => {
    let result = data.memberEngagements;
    if (selectedPersonIds.size > 0) {
      result = result.filter((m) => selectedPersonIds.has(m.userId));
    }
    if (selectedHealthStatuses.size > 0) {
      result = result.filter((m) => selectedHealthStatuses.has(m.healthStatus));
    }
    return result;
  }, [data.memberEngagements, selectedPersonIds, selectedHealthStatuses]);

  // ── Profile modal ─────────────────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState<UserEngagementSummary | null>(null);

  return (
    <div className={styles.page}>
      <PageHeader title="Meu time" />

      <Card padding="sm">
        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <CardBody>
          <div className={styles.toolbar}>

            {/* Filtro de time — só aparece com mais de 1 time */}
            {teams.length > 1 && (
              <div className={styles.filterItem}>
                <Button
                  ref={teamBtnRef}
                  variant="secondary"
                  size="sm"
                  leftIcon={UsersThree}
                  rightIcon={CaretDown}
                  onClick={() => setTeamOpen((v) => !v)}
                >
                  {teamLabel}
                </Button>
                <FilterDropdown
                  open={teamOpen}
                  onClose={() => setTeamOpen(false)}
                  anchorRef={teamBtnRef}
                  noOverlay
                >
                  <div className={styles.dropdownBody}>
                    {teams.map((team) => (
                      <div key={team.id} className={styles.checkboxRow}>
                        <Checkbox
                          checked={selectedTeamIds.includes(team.id)}
                          onChange={() => toggleTeam(team.id)}
                          size="sm"
                          label={team.name}
                        />
                      </div>
                    ))}
                  </div>
                </FilterDropdown>
              </div>
            )}

            {/* Filtro de pessoas */}
            {data.memberEngagements.length > 0 && (
              <div className={styles.filterItem}>
                <Button
                  ref={personBtnRef}
                  variant={selectedPersonIds.size > 0 ? "primary" : "secondary"}
                  size="sm"
                  leftIcon={User}
                  rightIcon={CaretDown}
                  onClick={() => setPersonOpen((v) => !v)}
                >
                  {personLabel}
                </Button>
                <FilterDropdown
                  open={personOpen}
                  onClose={() => setPersonOpen(false)}
                  anchorRef={personBtnRef}
                  noOverlay
                >
                  <div className={styles.dropdownBody}>
                    {data.memberEngagements.map((member) => (
                      <div key={member.userId} className={styles.checkboxRow}>
                        <Checkbox
                          checked={selectedPersonIds.has(member.userId)}
                          onChange={() => togglePerson(member.userId)}
                          size="sm"
                          label={member.name}
                        />
                      </div>
                    ))}
                  </div>
                </FilterDropdown>
              </div>
            )}

            {/* Filtro de saúde */}
            <div className={styles.filterItem}>
              <Button
                ref={healthBtnRef}
                variant={selectedHealthStatuses.size > 0 ? "primary" : "secondary"}
                size="sm"
                leftIcon={Heartbeat}
                rightIcon={CaretDown}
                onClick={() => setHealthOpen((v) => !v)}
              >
                {healthLabel}
              </Button>
              <FilterDropdown
                open={healthOpen}
                onClose={() => setHealthOpen(false)}
                anchorRef={healthBtnRef}
                noOverlay
              >
                <div className={styles.filterDropdownBody}>
                  {HEALTH_OPTIONS.map(({ status, color, label }) => (
                    <button
                      key={status}
                      type="button"
                      className={`${styles.filterDropdownItem} ${selectedHealthStatuses.has(status) ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => toggleHealth(status)}
                    >
                      <Badge color={color} size="sm">{label}</Badge>
                      {selectedHealthStatuses.has(status) && (
                        <Check size={14} className={styles.checkIcon} />
                      )}
                    </button>
                  ))}
                </div>
              </FilterDropdown>
            </div>

            {/* Filtro de período */}
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
                      {selectedCycleId === cycle.id && (
                        <Check size={14} className={styles.checkIcon} />
                      )}
                    </button>
                  ))}
                </div>
                <div className={styles.periodDropdownFooter}>
                  <button
                    ref={periodCustomBtnRef}
                    type="button"
                    className={`${styles.filterDropdownItem} ${selectedCycleId === CUSTOM_CYCLE_VALUE ? styles.filterDropdownItemActive : ""}`}
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
                        setSelectedCycleId(CUSTOM_CYCLE_VALUE);
                        setPeriodOpen(false);
                        setPeriodCustomOpen(false);
                      }
                    }}
                  />
                </div>
              </FilterDropdown>
            </div>

          </div>
        </CardBody>

        <CardDivider />

        {/* ── KPI Stats bar ─────────────────────────────────────────────── */}
        <CardBody>
          <EngagementStatsBar teamEngagement={data.teamEngagement} />
        </CardBody>

        <CardDivider />

        {/* ── Health table ──────────────────────────────────────────────── */}
        <TeamHealthTable
          members={filteredMembers}
          onMemberClick={(member) => setSelectedMember(member)}
        />
      </Card>

      {/* ── Collaborator profile modal ───────────────────────────────────── */}
      {selectedMember && (
        <CollaboratorProfileModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          period={activePeriod}
        />
      )}
    </div>
  );
}
