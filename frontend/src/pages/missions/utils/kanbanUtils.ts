import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import type { KanbanStatus } from "@/types";

export interface KanbanChildItem {
  id: string;
  label: string;
  value: number;
  target: number;
  goalLabel: string;
  ownerInitials: string;
  period: string;
  icon?: ComponentType<IconProps>;
}

export interface KanbanItem {
  id: string;
  label: string;
  missionTitle: string;
  missionId: string;
  value: number;
  target: number;
  goalLabel: string;
  ownerInitials: string;
  ownerName: string;
  period: string;
  type: "mission" | "task";
  icon?: ComponentType<IconProps>;
  children?: KanbanChildItem[];
  done?: boolean;
  status: string;
  isDraggable: boolean;
  teamName?: string;
  teamColor?: string;
}

export function getKanbanStatus(item: Pick<KanbanItem, "type" | "status">): KanbanStatus {
  if (item.type === "task") {
    if (item.status === "done") return "done";
    if (item.status === "in_progress") return "doing";
    return "todo";
  }
  // mission child
  if (item.status === "completed") return "done";
  if (item.status === "active") return "doing";
  return "todo";
}

export function taskColToApiStatus(col: KanbanStatus): "todo" | "in_progress" | "done" {
  if (col === "doing") return "in_progress";
  return col as "todo" | "done";
}

export function missionColToApiStatus(col: KanbanStatus): "draft" | "active" | "completed" {
  if (col === "todo") return "draft";
  if (col === "doing") return "active";
  return "completed";
}
