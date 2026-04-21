import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import {
  Trophy,
  ArrowsInLineVertical,
  PlugsConnected,
  Target,
  Crosshair,
  ChartLineUp,
  TrendDown,
  ArrowsInLineHorizontal,
  ChartBar,
} from "@phosphor-icons/react";
import type { KeyResult, GoalType, KRStatus } from "@/types";

/* ——— Numeric helpers ——— */

/** Parse decimal string (from DB) to number */
export function numVal(v: string | null | undefined): number {
  if (v == null || v === "") return 0;
  return Number(v) || 0;
}

/* ——— Goal type helpers ——— */

const GOAL_TYPE_ICONS: Record<GoalType, ComponentType<IconProps>> = {
  reach: Crosshair,
  above: ChartLineUp,
  below: TrendDown,
  between: ArrowsInLineHorizontal,
  reduce: TrendDown,
  survey: ChartBar,
};

function getGoalTypeIcon(goalType: GoalType): ComponentType<IconProps> {
  return GOAL_TYPE_ICONS[goalType] ?? Trophy;
}

/** Build a human-readable goal label from KR fields */
export function getGoalLabel(kr: KeyResult): string {
  const target = numVal(kr.targetValue);
  const low = numVal(kr.lowThreshold);
  const high = numVal(kr.highThreshold);
  const unit = kr.unitLabel ?? (kr.unit === "percent" ? "%" : kr.unit === "currency" ? "R$" : "");

  switch (kr.goalType) {
    case "reach":
      return `Atingir ${unit === "R$" || unit === "US$" ? `${unit} ${target.toLocaleString("pt-BR")}` : `${target}${unit ? ` ${unit}` : ""}`}`;
    case "above":
      return `Manter acima de ${unit} ${low}`.trim();
    case "below":
      return `Manter abaixo de ${unit} ${high}`.trim();
    case "between":
      return `Manter entre ${low} e ${high}`;
    case "reduce":
      return `Reduzir para ${target}${unit ? ` ${unit}` : ""}`;
    case "survey":
      return `De pesquisa vinculada`;
    default:
      return "";
  }
}

/* ——— Status helpers ——— */

const STATUS_LABELS: Record<KRStatus, string> = {
  on_track: "No ritmo",
  attention: "Atenção",
  off_track: "Atrasado",
  completed: "Concluído",
};

function getKRStatusLabel(status: KRStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Map KRStatus to DS Badge color */
function getKRStatusBadge(status: KRStatus): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "on_track": return "success";
    case "attention": return "warning";
    case "off_track": return "error";
    case "completed": return "success";
    default: return "neutral";
  }
}

/* ——— Period helpers ——— */

export function formatPeriodRange(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  return `${fmt(start)} à ${fmt(end)}`;
}

/* ——— Owner helpers ——— */

export function getOwnerName(owner?: { firstName: string; lastName: string }): string {
  if (!owner) return "";
  return `${owner.firstName} ${owner.lastName}`;
}

export function getOwnerInitials(owner?: { firstName: string; lastName: string; initials: string | null }): string {
  if (!owner) return "??";
  if (owner.initials) return owner.initials;
  return `${owner.firstName[0] ?? ""}${owner.lastName[0] ?? ""}`.toUpperCase();
}

/* ——— Indicator icon helper (by content/type) ——— */

export function getIndicatorIcon(kr: KeyResult): ComponentType<IconProps> {
  if (kr.goalType === "between" || kr.goalType === "above" || kr.goalType === "below") {
    return ArrowsInLineVertical;
  }
  if (kr.measurementMode === "external") return PlugsConnected;
  if (kr.measurementMode === "mission") return Target;
  return getGoalTypeIcon(kr.goalType);
}

/* ——— Date formatting for check-ins ——— */

export function formatCheckinDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
