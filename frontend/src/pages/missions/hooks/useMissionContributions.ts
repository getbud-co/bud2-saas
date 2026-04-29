import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "@getbud-co/buds";
import type { KeyResult, Mission, MissionTask } from "@/types";
import { useUpdateTask } from "@/hooks/use-tasks";
import { findTaskInMissions } from "../utils/missionTree";

interface UseMissionContributionsParams {
  missions: Mission[];
  setOpenRowMenu: Dispatch<SetStateAction<string | null>>;
  setOpenContributeFor: Dispatch<SetStateAction<string | null>>;
  setContributePickerSearch: Dispatch<SetStateAction<string>>;
}

export function useMissionContributions({
  missions,
  setOpenRowMenu,
  setOpenContributeFor,
  setContributePickerSearch,
}: UseMissionContributionsParams) {
  const updateTask = useUpdateTask();

  const [removeContribConfirm, setRemoveContribConfirm] = useState<{
    itemId: string;
    itemType: "indicator" | "task";
    targetMissionId: string;
    targetMissionTitle: string;
  } | null>(null);

  function handleRequestRemoveContribution(
    itemId: string,
    itemType: "indicator" | "task",
    targetMissionId: string,
    targetMissionTitle: string,
  ) {
    setRemoveContribConfirm({ itemId, itemType, targetMissionId, targetMissionTitle });
  }

  function handleRemoveContribution(itemId: string, itemType: "indicator" | "task", targetMissionId: string) {
    if (itemType === "task") {
      const task = findTaskInMissions(itemId, missions);
      const currentIds = task?.contributesTo?.map((c) => c.missionId) ?? [];
      const newIds = currentIds.filter((id) => id !== targetMissionId);
      updateTask.mutate({ id: itemId, patch: { contributesToMissionIds: newIds } });
    }
    // Indicator contributions: optimistic tree update removed; cache refresh
    // after useUpdateIndicator (Phase 1) will recompute externalContributions.
    setOpenRowMenu(null);
    setOpenContributeFor(null);
    toast.success("Contribuição removida");
  }

  function handleAddContribution(
    item: KeyResult | MissionTask,
    itemType: "indicator" | "task",
    _sourceMissionId: string,
    _sourceMissionTitle: string,
    targetMissionId: string,
    _targetMissionTitle: string,
  ) {
    if (itemType === "task") {
      const currentIds = (item as MissionTask).contributesTo?.map((c) => c.missionId) ?? [];
      const newIds = [...new Set([...currentIds, targetMissionId])];
      updateTask.mutate({ id: item.id, patch: { contributesToMissionIds: newIds } });
    }
    // Indicator contributions: optimistic tree update removed; Phase 1 will
    // wire useUpdateIndicator here and cache refresh recomputes contributions.

    setOpenRowMenu(null);
    setOpenContributeFor(null);
    setContributePickerSearch("");
    toast.success("Contribuição adicionada");
  }

  return {
    removeContribConfirm,
    setRemoveContribConfirm,
    handleRequestRemoveContribution,
    handleRemoveContribution,
    handleAddContribution,
  };
}
