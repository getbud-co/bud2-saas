import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  CardDivider,
  Button,
  DatePicker,
  FilterDropdown,
} from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import {
  Table,
  ChartDonut,
  ChatCircleDots,
  Lightning,
  CaretRight,
  CaretDown,
  UserCircle,
  CalendarCheck,
  CalendarBlank,
  Megaphone,
  Plus,
  Check,
} from "@phosphor-icons/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCycles } from "@/hooks/use-cycles";
import type { HomeActivityItem } from "./hooks/useHomeMissionReadModel";
import { useHomeActivities } from "./hooks/useHomeActivities";
import styles from "./ActivitiesDetailPage.module.css";

const CUSTOM_CYCLE_VALUE = "__custom__";

function formatCalendarDate(d: CalendarDate): string {
  return `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}/${d.year}`;
}

interface Activity extends HomeActivityItem {
  icon: React.ComponentType<{ size?: number }>;
}

function iconByCategory(category: string): React.ComponentType<{ size?: number }> {
  switch (category) {
    case "Pesquisas": return Table;
    case "Missões": return ChartDonut;
    case "Check-ins": return ChatCircleDots;
    case "IA": return Lightning;
    case "Pessoas": return UserCircle;
    case "1:1": return CalendarCheck;
    case "Reconhecimento": return Megaphone;
    default: return Table;
  }
}

function toActivity(input: HomeActivityItem): Activity {
  return { ...input, icon: iconByCategory(input.category) };
}

function ActivityItem({ activity, onClick }: { activity: Activity; onClick?: () => void }) {
  return (
    <li
      className={styles.item}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    >
      <div className={styles.iconBox}>
        <activity.icon size={16} />
      </div>
      <div className={styles.text}>
        <p className={styles.title}>{activity.title}</p>
        <p className={activity.urgent ? styles.subtitleUrgent : styles.subtitle}>
          {activity.subtitle}
        </p>
      </div>
      <CaretRight size={16} className={styles.caret} />
    </li>
  );
}

export function ActivitiesDetailPage() {
  const navigate = useNavigate();
  const { allActivities: allActivitiesInput } = useHomeActivities();
  const { data: cycles = [] } = useCycles();

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

  // ── Filter activities by period ─────────────────────────────────────────
  const allActivities = useMemo(() => {
    const mapped = allActivitiesInput.map(toActivity);

    // Determine period range
    let start: Date | null = null;
    let end: Date | null = null;
    if (selectedCycleId === CUSTOM_CYCLE_VALUE) {
      const [s, e] = customRange;
      if (s) start = new Date(s.year, s.month - 1, s.day);
      if (e) end = new Date(e.year, e.month - 1, e.day, 23, 59, 59);
    } else {
      const cycle = cycles.find((c) => c.id === selectedCycleId);
      if (cycle) {
        start = new Date(cycle.start_date);
        end = new Date(cycle.end_date + "T23:59:59");
      }
    }

    if (!start && !end) return mapped;

    return mapped.filter((a) => {
      if (!a.createdAt) return true; // Keep activities without date
      const d = new Date(a.createdAt);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [allActivitiesInput, selectedCycleId, customRange, cycles]);

  const urgentCount = allActivities.filter((a) => a.urgent).length;

  function handleNavigate(activity: Activity) {
    navigate(activity.route, { state: activity.routeState });
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Minhas atividades" />

      <Card padding="sm">
        <CardBody>
          <div className={styles.toolbar}>
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

        <CardBody>
          {urgentCount > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Urgentes</p>
              <ul className={styles.list}>
                {allActivities.filter((a) => a.urgent).map((activity, i) => (
                  <ActivityItem key={`urgent-${i}`} activity={activity} onClick={() => handleNavigate(activity)} />
                ))}
              </ul>
            </div>
          )}

          <div className={styles.section}>
            <p className={styles.sectionTitle}>Todas as atividades</p>
            <ul className={styles.list}>
              {allActivities.filter((a) => !a.urgent).map((activity, i) => (
                <ActivityItem key={`all-${i}`} activity={activity} onClick={() => handleNavigate(activity)} />
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
