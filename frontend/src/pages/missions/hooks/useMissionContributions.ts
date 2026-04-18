import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "@getbud-co/buds";
import type { ExternalContribution, KeyResult, Mission, MissionTask } from "@/types";
import {
  addExternalContrib,
  addKRContribution,
  addTaskContribution,
  removeExternalContrib,
  removeKRContribution,
  removeTaskContribution,
} from "../utils/missionTree";

type MissionContributionTarget = { missionId: string; missionTitle: string };

interface UseMissionContributionsParams {
  setMissions: Dispatch<SetStateAction<Mission[]>>;
  setDrawerContributesTo: Dispatch<SetStateAction<MissionContributionTarget[]>>;
  setOpenRowMenu: Dispatch<SetStateAction<string | null>>;
  setOpenContributeFor: Dispatch<SetStateAction<string | null>>;
  setContributePickerSearch: Dispatch<SetStateAction<string>>;
}

export function useMissionContributions({
  setMissions,
  setDrawerContributesTo,
  setOpenRowMenu,
  setOpenContributeFor,
  setContributePickerSearch,
}: UseMissionContributionsParams) {
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
    setMissions((prev) => {
      const removed = itemType === "indicator"
        ? removeKRContribution(prev, itemId, targetMissionId)
        : removeTaskContribution(prev, itemId, targetMissionId);
      return removeExternalContrib(removed, targetMissionId, itemId);
    });

    setDrawerContributesTo((prev) => prev.filter((ct) => ct.missionId !== targetMissionId));
    setOpenRowMenu(null);
    setOpenContributeFor(null);
    toast.success("Contribuição removida");
  }

  function handleAddContribution(
    item: KeyResult | MissionTask,
    itemType: "indicator" | "task",
    sourceMissionId: string,
    sourceMissionTitle: string,
    targetMissionId: string,
    targetMissionTitle: string,
  ) {
    const target = { id: targetMissionId, title: targetMissionTitle };

    const contrib: ExternalContribution = itemType === "indicator"
      ? {
          type: "indicator",
          id: item.id,
          title: item.title,
          progress: (item as KeyResult).progress,
          status: (item as KeyResult).status,
          owner: item.owner,
          sourceMission: { id: sourceMissionId, title: sourceMissionTitle },
        }
      : {
          type: "task",
          id: item.id,
          title: item.title,
          isDone: (item as MissionTask).isDone,
          owner: item.owner,
          sourceMission: { id: sourceMissionId, title: sourceMissionTitle },
        };

    setMissions((prev) => {
      const withConnection = itemType === "indicator"
        ? addKRContribution(prev, item.id, target)
        : addTaskContribution(prev, item.id, target);
      return addExternalContrib(withConnection, targetMissionId, contrib);
    });

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
