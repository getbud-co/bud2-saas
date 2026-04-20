import type { MutableRefObject } from "react";
import type { CalendarDate } from "@getbud-co/buds";
import type { Mission, KeyResult, MissionTask, ExternalContribution } from "@/types";

export interface TemplateConfig {
  stepTitle: string;
  namePlaceholder: string;
  descPlaceholder: string;
  addItemLabel: string;
  addItemFormTitle: string;
  editItemFormTitle: string;
  itemTitlePlaceholder: string;
  itemDescPlaceholder: string;
  /** Which measurement modes to show; null = show all */
  allowedModes: string[] | null;
  /** Override label for "Tags" in more options menu */
  tagLabel?: string;
}

export interface ExampleEntry {
  objective: string;
  keyResults: string[];
}

export interface ExampleCategory {
  label: string;
  examples: ExampleEntry[];
}

export interface MissionItemData {
  id: string;
  name: string;
  description: string;
  measurementMode: string | null;
  manualType: string | null;
  surveyId: string | null;
  period: [CalendarDate | null, CalendarDate | null];
  goalValue: string;
  goalValueMin: string;
  goalValueMax: string;
  goalUnit: string;
  /** Override owner — null means inherit from parent mission */
  ownerId: string | null;
  /** Override team — null means inherit from parent mission */
  teamId: string | null;
  children?: MissionItemData[];
}

export interface CheckinPayload {
  keyResult: KeyResult;
  currentValue: number;
  newValue: number;
}

export interface MissionItemProps {
  mission: Mission;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onExpand: (mission: Mission) => void;
  onEdit: (mission: Mission) => void;
  onDelete?: (mission: Mission) => void;
  onCheckin?: (payload: CheckinPayload) => void;
  onToggleTask?: (taskId: string) => void;
  onOpenTaskDrawer?: (task: MissionTask, parentLabel: string) => void;
  expandedMissions: Set<string>;
  isLast?: boolean;
  isChild?: boolean;
  hideExpand?: boolean;
  /* row menu (⋯) for indicators and tasks */
  openRowMenu?: string | null;
  setOpenRowMenu?: (id: string | null) => void;
  openContributeFor?: string | null;
  setOpenContributeFor?: (id: string | null) => void;
  contributePickerSearch?: string;
  setContributePickerSearch?: (s: string) => void;
  rowMenuBtnRefs?: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  allMissions?: { id: string; title: string }[];
  onAddContribution?: (item: KeyResult | MissionTask, itemType: "indicator" | "task", sourceMissionId: string, sourceMissionTitle: string, targetMissionId: string, targetMissionTitle: string) => void;
  onRemoveContribution?: (itemId: string, itemType: "indicator" | "task", targetMissionId: string, targetMissionTitle: string) => void;
  onOpenExternalContrib?: (ec: ExternalContribution) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
}
