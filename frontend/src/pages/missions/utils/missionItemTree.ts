import type { CalendarDate } from "@getbud-co/buds";
import type { Mission } from "@/types";
import type { MissionItemData } from "../missionTypes";
import { UNIT_OPTIONS } from "../missionConstants";

/** Recursively add child to a parent anywhere in the MissionItemData tree */
export function addChildToParent(items: MissionItemData[], parentId: string, child: MissionItemData): MissionItemData[] {
  return items.map((item) => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children ?? []), child] };
    }
    if (item.children?.length) {
      return { ...item, children: addChildToParent(item.children, parentId, child) };
    }
    return item;
  });
}

/** Recursively remove a child from anywhere in the MissionItemData tree */
export function removeChildFromTree(items: MissionItemData[], childId: string): MissionItemData[] {
  return items
    .filter((item) => item.id !== childId)
    .map((item) =>
      item.children?.length
        ? { ...item, children: removeChildFromTree(item.children, childId) }
        : item
    );
}

/** Recursively replace an item in the MissionItemData tree */
export function replaceItemInTree(items: MissionItemData[], itemId: string, newItem: MissionItemData): MissionItemData[] {
  return items.map((item) => {
    if (item.id === itemId) return newItem;
    if (item.children?.length) {
      return { ...item, children: replaceItemInTree(item.children, itemId, newItem) };
    }
    return item;
  });
}

/** Convert CalendarDate to ISO string (YYYY-MM-DD) */
export function calendarDateToIso(date: CalendarDate | null): string | null {
  if (!date) return null;
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/** Map unit string to KeyResult.unit enum */
export function unitFromValue(unit: string): "percent" | "currency" | "count" | "custom" {
  if (unit === "%") return "percent";
  if (unit === "R$" || unit === "US$") return "currency";
  if (!unit || unit === "un") return "count";
  return "custom";
}

/** Build human-readable goal summary text from a MissionItemData */
export function getGoalSummary(item: MissionItemData): string {
  if (item.measurementMode !== "manual" || !item.manualType) return "";
  const unit = UNIT_OPTIONS.find((u) => u.value === item.goalUnit)?.label ?? item.goalUnit;
  if (item.manualType === "between") return item.goalValueMin && item.goalValueMax ? `${item.goalValueMin} – ${item.goalValueMax} ${unit}` : "";
  if (item.manualType === "above") return item.goalValueMin ? `≥ ${item.goalValueMin} ${unit}` : "";
  if (item.manualType === "below") return item.goalValueMax ? `≤ ${item.goalValueMax} ${unit}` : "";
  if (item.goalValue) return `${item.goalValue} ${unit}`;
  return "";
}

/** Recursively count all items in a MissionItemData tree */
export function countAllItems(items: MissionItemData[]): number {
  let count = 0;
  for (const item of items) {
    count += 1;
    if (item.children?.length) count += countAllItems(item.children);
  }
  return count;
}

/** Collect the IDs of a mission and all its nested children */
export function collectMissionIds(mission: Mission): string[] {
  const ids = [mission.id];
  for (const child of mission.children ?? []) {
    ids.push(...collectMissionIds(child));
  }
  return ids;
}
