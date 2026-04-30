import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardBody,
  CardDivider,
  Button,
  Chart,
  Badge,
  Checkbox,
  DatePicker,
  FilterDropdown,
  ChartTooltipContent,
} from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
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
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { useCycles } from "@/hooks/use-cycles";
import { useTeamOverviewData, type PeriodFilter } from "@/hooks/useTeamOverviewData";
import { TeamHealthTable } from "@/pages/my-team/modules/components/TeamHealthTable";
import { CollaboratorProfileModal } from "@/pages/my-team/modules/components/CollaboratorProfileModal";
import type { HealthStatus, UserEngagementSummary } from "@/types/engagement";
import { generateWeeklyEngagementData } from "@/lib/engagement-utils";
import styles from "./EngagementDetailPage.module.css";

// ── Constants ───────────────────────────────────────────────────────────────

const CUSTOM_CYCLE_VALUE = "__custom__";

const HEALTH_OPTIONS: { status: HealthStatus; color: "success" | "warning" | "error"; label: string }[] = [
  { status: "healthy",   color: "success", label: "Bem"     },
  { status: "attention", color: "warning", label: "Atenção" },
  { status: "critical",  color: "error",   label: "Crítico" },
];

function formatCalendarDate(d: CalendarDate): string {
  return `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}/${d.year}`;
}

// ── Component ───────────────────────────────────────────────────────────────

export function EngagementDetailPage() {
  const { teams: allTeams, currentUserId } = usePeopleData();
  const { data: cycles = [] } = useCycles();

  // ── Team filter (default = teams led by current user) ───────────────────
  const myTeamIds = useMemo(() => {
    const led = allTeams.filter((t) => t.leaderId === currentUserId).map((t) => t.id);
    return led.length > 0 ? led : allTeams.length > 0 ? [allTeams[0]!.id] : [];
  }, [allTeams, currentUserId]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(myTeamIds);
  const teamBtnRef = useRef<HTMLButtonElement>(null);
  const [teamOpen, setTeamOpen] = useState(false);

  // Sync default when teams load
  useEffect(() => {
    if (selectedTeamIds.length === 0 && myTeamIds.length > 0) {
      setSelectedTeamIds(myTeamIds);
    }
  }, [myTeamIds, selectedTeamIds.length]);

  function toggleTeam(id: string) {
    setSelectedTeamIds((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((t) => t !== id) : prev
        : [...prev, id],
    );
  }

  const isAllTeams = selectedTeamIds.length === allTeams.length;

  const teamLabel = useMemo(() => {
    if (isAllTeams) return "Todos os times";
    const sel = allTeams.filter((t) => selectedTeamIds.includes(t.id));
    if (sel.length === 0) return "Selecionar time";
    if (sel.length === 1) return sel[0]!.name;
    return `${sel.length} times`;
  }, [allTeams, selectedTeamIds, isAllTeams]);

  // ── Period filter ───────────────────────────────────────────────────────
  const defaultCycleId = useMemo(
    () => cycles.find((c) => c.status === "active")?.id ?? cycles[0]?.id ?? "",
    [cycles],
  );
  const [selectedCycleId, setSelectedCycleId] = useState("");
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

  const activePeriod = useMemo((): PeriodFilter | null => {
    if (selectedCycleId === CUSTOM_CYCLE_VALUE) {
      const [s, e] = customRange;
      if (!s && !e) return null;
      const toIso = (d: CalendarDate) =>
        `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
      return { startDate: s ? toIso(s) : null, endDate: e ? toIso(e) : null };
    }
    const cycle = cycles.find((c) => c.id === selectedCycleId);
    if (!cycle) return null;
    return { startDate: cycle.start_date, endDate: cycle.end_date };
  }, [selectedCycleId, customRange, cycles]);

  // ── Data (same source as Meu Time) ─────────────────────────────────────
  const { memberEngagements } = useTeamOverviewData(selectedTeamIds, activePeriod);

  // ── People filter ───────────────────────────────────────────────────────
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set());
  const personBtnRef = useRef<HTMLButtonElement>(null);
  const [personOpen, setPersonOpen] = useState(false);

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
      const m = memberEngagements.find((m) => selectedPersonIds.has(m.userId));
      return m?.name ?? "1 pessoa";
    }
    return `${selectedPersonIds.size} pessoas`;
  }, [selectedPersonIds, memberEngagements]);

  // ── Health status filter ────────────────────────────────────────────────
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

  // ── Filtered members ────────────────────────────────────────────────────
  const filteredMembers = useMemo((): UserEngagementSummary[] => {
    let result = memberEngagements;
    if (selectedPersonIds.size > 0) {
      result = result.filter((m) => selectedPersonIds.has(m.userId));
    }
    if (selectedHealthStatuses.size > 0) {
      result = result.filter((m) => selectedHealthStatuses.has(m.healthStatus));
    }
    return result;
  }, [memberEngagements, selectedPersonIds, selectedHealthStatuses]);

  // ── Gauges derived from filtered members ────────────────────────────────
  const { performanceScore, engagementScore, overallScore } = useMemo(() => {
    if (filteredMembers.length === 0) return { performanceScore: 0, engagementScore: 0, overallScore: 0 };
    const perf = Math.round(filteredMembers.reduce((sum, m) => sum + m.performanceScore, 0) / filteredMembers.length);
    const eng = Math.round(filteredMembers.reduce((sum, m) => sum + m.engagementScore, 0) / filteredMembers.length);
    return { performanceScore: perf, engagementScore: eng, overallScore: Math.round((perf + eng) / 2) };
  }, [filteredMembers]);

  // ── Weekly chart data filtered by selected members ──────────────────────
  const weeklyData = useMemo(() => {
    const filteredUserIds = new Set(filteredMembers.map((m) => m.userId));
    // Phase 5: wire per-indicator check-in queries here once team overview
    // drives its own fetches. For now pass an empty map so the chart degrades.
    return generateWeeklyEngagementData({}, filteredUserIds, activePeriod);
  }, [filteredMembers, activePeriod]);

  // ── Profile modal ───────────────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState<UserEngagementSummary | null>(null);

  return (
    <div className={styles.page}>
      <PageHeader title="Engajamento" />

      <Card padding="sm">
        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <CardBody>
          <div className={styles.toolbar}>
            {/* Team filter */}
            {allTeams.length > 1 && (
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
                <FilterDropdown open={teamOpen} onClose={() => setTeamOpen(false)} anchorRef={teamBtnRef} noOverlay>
                  <div className={styles.dropdownBody}>
                    {allTeams.map((team) => (
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

            {/* People filter */}
            {memberEngagements.length > 0 && (
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
                <FilterDropdown open={personOpen} onClose={() => setPersonOpen(false)} anchorRef={personBtnRef} noOverlay>
                  <div className={styles.dropdownBody}>
                    {memberEngagements.map((member) => (
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

            {/* Health status filter */}
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
              <FilterDropdown open={healthOpen} onClose={() => setHealthOpen(false)} anchorRef={healthBtnRef} noOverlay>
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

            {/* Period filter */}
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

        {/* ── Gauges ───────────────────────────────────────────────────── */}
        <CardBody>
          <div className={styles.gaugeRow}>
            <div className={styles.gaugeItem}>
              <Chart value={overallScore} variant="half" size={100} />
              <span className={styles.gaugeLabel}>Score geral</span>
            </div>
            <div className={styles.gaugeItem}>
              <Chart value={performanceScore} variant="half" size={100} />
              <span className={styles.gaugeLabel}>Performance</span>
            </div>
            <div className={styles.gaugeItem}>
              <Chart value={engagementScore} variant="half" size={100} />
              <span className={styles.gaugeLabel}>Engajamento</span>
            </div>
          </div>

          <div className={styles.chartSection}>
            <h3 className={styles.sectionTitle}>Evolução semanal</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyData}>
                  <CartesianGrid stroke="var(--color-caramel-200)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontFamily: "var(--font-label)", fontSize: 12, fill: "var(--color-neutral-500)" }} axisLine={false} tickLine={false} tickMargin={12} />
                  <YAxis domain={[0, 100]} tick={{ fontFamily: "var(--font-label)", fontSize: 12, fill: "var(--color-neutral-500)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<ChartTooltipContent valueFormatter={(v) => `${v}%`} />} animationDuration={150} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="engajamento" name="Engajamento" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="missoes" name="Missões" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pulso" name="Pulso" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardBody>

        <CardDivider />

        {/* ── Table ────────────────────────────────────────────────────── */}
        <TeamHealthTable
          members={filteredMembers}
          onMemberClick={setSelectedMember}
        />
      </Card>

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
