import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Mission } from "@/types";
import { useMissions } from "@/hooks/use-missions";
import { useIndicators } from "@/hooks/use-indicators";
import { useTasks } from "@/hooks/use-tasks";
import { composeMissionTree } from "@/lib/compose-mission-tree";

interface MissionsDataContextValue {
  missions: Mission[];
  /**
   * True while the initial /missions fetch from the API is in flight and
   * there are no missions yet. Components can show a skeleton while true.
   */
  isLoadingMissions: boolean;
}

const MissionsDataContext = createContext<MissionsDataContextValue | null>(null);

export function MissionsDataProvider({ children }: { children: ReactNode }) {
  const { data: apiMissions, isLoading: isLoadingMissionsRaw } = useMissions();
  const { data: apiIndicators } = useIndicators();
  const { data: apiTasks } = useTasks();

  const missions = useMemo(
    () => composeMissionTree(apiMissions, apiIndicators, apiTasks),
    [apiMissions, apiIndicators, apiTasks],
  );

  const isLoadingMissions = isLoadingMissionsRaw && missions.length === 0;

  const value = useMemo<MissionsDataContextValue>(() => ({
    missions,
    isLoadingMissions,
  }), [missions, isLoadingMissions]);

  return (
    <MissionsDataContext.Provider value={value}>
      {children}
    </MissionsDataContext.Provider>
  );
}

export function useMissionsData() {
  const ctx = useContext(MissionsDataContext);
  if (!ctx) {
    throw new Error("useMissionsData must be used within MissionsDataProvider");
  }
  return ctx;
}
