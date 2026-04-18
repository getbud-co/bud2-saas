import type { CheckIn } from "@/types";
import { numVal } from "@/lib/missions";
import { formatDateShort } from "@/lib/date-format";

export interface CheckInChartPoint {
  date: string;
  value: number;
}

export function sortCheckInsDesc(checkIns: CheckIn[]): CheckIn[] {
  return [...checkIns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function buildCheckInChartData(checkIns: CheckIn[]): CheckInChartPoint[] {
  const ordered = [...checkIns].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return ordered.map((entry) => ({
    date: formatDateShort(entry.createdAt),
    value: numVal(entry.value),
  }));
}
