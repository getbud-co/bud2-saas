import type { CalendarDate } from "@getbud-co/buds";
import type { Mission, KeyResult, MissionTask } from "@/types";
import { getOwnerInitials } from "@/lib/missions";

export interface MissionFilterState {
  activeFilters: string[];
  selectedTeams: string[];
  selectedPeriod: [CalendarDate | null, CalendarDate | null];
  selectedStatus: string;
  selectedOwners: string[];
  selectedItemTypes: string[];
  selectedIndicatorTypes: string[];
  selectedContributions: string[];
  selectedSupporters: string[];
  selectedTaskState: string;
  selectedMissionStatuses: string[];
}

export interface MissionFilterContext {
  ownerFilterOptions: { id: string; initials?: string; label?: string }[];
  resolveTeamId: (id: string) => string;
  resolveUserId: (id: string) => string;
  userTeamsMap: Map<string, Set<string>>;
}

export function filterMissions(
  missions: Mission[],
  filters: MissionFilterState,
  ctx: MissionFilterContext,
): Mission[] {
  const {
    activeFilters,
    selectedTeams,
    selectedPeriod,
    selectedStatus,
    selectedOwners,
    selectedItemTypes,
    selectedIndicatorTypes,
    selectedContributions,
    selectedSupporters,
    selectedTaskState,
    selectedMissionStatuses,
  } = filters;

  const ownerFilterActive = activeFilters.includes("owner") && !selectedOwners.includes("all") && selectedOwners.length > 0;
  const teamFilterActive = activeFilters.includes("team") && !selectedTeams.includes("all") && selectedTeams.length > 0;
  const periodFilterActive = activeFilters.includes("period") && (!!selectedPeriod[0] || !!selectedPeriod[1]);
  const statusFilterActive = activeFilters.includes("status") && selectedStatus !== "all";
  const itemTypeFilterActive = activeFilters.includes("itemType") && !selectedItemTypes.includes("all") && selectedItemTypes.length > 0;
  const indicatorTypeFilterActive = activeFilters.includes("indicatorType") && !selectedIndicatorTypes.includes("all") && selectedIndicatorTypes.length > 0;
  const contributionFilterActive = activeFilters.includes("contribution") && !selectedContributions.includes("all") && selectedContributions.length > 0;
  const taskStateFilterActive = activeFilters.includes("taskState") && selectedTaskState !== "all";
  const missionStatusFilterActive = activeFilters.includes("missionStatus") && !selectedMissionStatuses.includes("all") && selectedMissionStatuses.length > 0;
  const supporterFilterActive = activeFilters.includes("supporter") && !selectedSupporters.includes("all") && selectedSupporters.length > 0;

  const selectedTeamSet = new Set(selectedTeams.filter((id) => id !== "all").map((id) => ctx.resolveTeamId(id)));
  const selectedItemTypeSet = new Set(selectedItemTypes.filter((id) => id !== "all"));
  const selectedIndicatorTypeSet = new Set(selectedIndicatorTypes.filter((id) => id !== "all"));
  const selectedContributionSet = new Set(selectedContributions.filter((id) => id !== "all"));
  const selectedMissionStatusSet = new Set(selectedMissionStatuses.filter((id) => id !== "all"));
  const selectedOwnerIds = new Set(
    selectedOwners
      .filter((id) => id !== "all")
      .map((id) => ctx.resolveUserId(id).toLowerCase()),
  );
  const selectedOwnerInitials = new Set(
    selectedOwners
      .filter((id) => id !== "all")
      .map((id) => ctx.ownerFilterOptions.find((option) => option.id === id)?.initials?.toLowerCase() ?? id.toLowerCase())
      .filter((value) => value.length > 0),
  );
  const statusValue = selectedStatus.replace(/-/g, "_");
  const selectedSupporterIds = new Set(
    selectedSupporters.filter((id) => id !== "all").map((id) => ctx.resolveUserId(id).toLowerCase()),
  );

  function ownerBelongsToSelectedTeam(ownerId: string | undefined | null): boolean {
    if (!ownerId) return false;
    const ownerTeams = ctx.userTeamsMap.get(ctx.resolveUserId(ownerId));
    if (!ownerTeams) return false;
    for (const tid of selectedTeamSet) {
      if (ownerTeams.has(tid)) return true;
    }
    return false;
  }

  function toTimestampFromCalendar(value: CalendarDate | null): number | null {
    if (!value) return null;
    return new Date(value.year, value.month - 1, value.day).getTime();
  }

  function toTimestampFromIso(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  function dateRangeMatches(startIso: string | null | undefined, endIso: string | null | undefined): boolean {
    if (!periodFilterActive) return true;

    const filterStart = toTimestampFromCalendar(selectedPeriod[0]);
    const filterEnd = toTimestampFromCalendar(selectedPeriod[1]);
    const normalizedFilterStart = filterStart ?? filterEnd;
    const normalizedFilterEnd = filterEnd ?? filterStart;

    if (normalizedFilterStart === null || normalizedFilterEnd === null) {
      return true;
    }

    const start = toTimestampFromIso(startIso);
    const end = toTimestampFromIso(endIso);
    const normalizedStart = start ?? end;
    const normalizedEnd = end ?? start;

    if (normalizedStart === null || normalizedEnd === null) {
      return false;
    }

    return normalizedStart <= normalizedFilterEnd && normalizedEnd >= normalizedFilterStart;
  }

  function ownerMatches(owner?: { id: string; firstName: string; lastName: string; initials: string | null }): boolean {
    if (!ownerFilterActive) return true;
    if (!owner) return false;

    const initials = getOwnerInitials(owner).toLowerCase();
    return selectedOwnerInitials.has(initials) || selectedOwnerIds.has(ctx.resolveUserId(owner.id).toLowerCase());
  }

  function missionSupporterMatches(mission: Mission): boolean {
    if (!supporterFilterActive) return true;
    return (mission.members ?? []).some(
      (m) => m.role === "supporter" && selectedSupporterIds.has(ctx.resolveUserId(m.userId).toLowerCase()),
    );
  }

  function keyResultHasContribution(kr: KeyResult): boolean {
    if ((kr.contributesTo?.length ?? 0) > 0) return true;
    if ((kr.tasks ?? []).some((task) => (task.contributesTo?.length ?? 0) > 0)) return true;
    if ((kr.children ?? []).some((child) => keyResultHasContribution(child))) return true;
    return false;
  }

  function missionHasContribution(mission: Mission): boolean {
    if ((mission.tasks ?? []).some((task) => (task.contributesTo?.length ?? 0) > 0)) return true;
    if ((mission.keyResults ?? []).some((kr) => keyResultHasContribution(kr))) return true;
    return false;
  }

  function missionContributionMatches(mission: Mission): boolean {
    if (!contributionFilterActive) return true;

    const hasContributing = missionHasContribution(mission);
    const hasReceiving = (mission.externalContributions?.length ?? 0) > 0;
    const hasNone = !hasContributing && !hasReceiving;

    if (selectedContributionSet.has("contributing") && hasContributing) return true;
    if (selectedContributionSet.has("receiving") && hasReceiving) return true;
    if (selectedContributionSet.has("none") && hasNone) return true;
    return false;
  }

  function keyResultContributionMatches(kr: KeyResult): boolean {
    if (!contributionFilterActive) return true;
    // "receiving" is a mission-level concept (externalContributions); pass KRs through
    if (selectedContributionSet.has("receiving")) return true;

    const hasContributing = (kr.contributesTo?.length ?? 0) > 0;
    if (selectedContributionSet.has("contributing") && hasContributing) return true;
    if (selectedContributionSet.has("none") && !hasContributing) return true;
    return false;
  }

  function taskContributionMatches(task: MissionTask): boolean {
    if (!contributionFilterActive) return true;
    // "receiving" is a mission-level concept; pass tasks through
    if (selectedContributionSet.has("receiving")) return true;

    const hasContributing = (task.contributesTo?.length ?? 0) > 0;
    if (selectedContributionSet.has("contributing") && hasContributing) return true;
    if (selectedContributionSet.has("none") && !hasContributing) return true;
    return false;
  }

  function indicatorTypeMatches(kr: KeyResult): boolean {
    if (!indicatorTypeFilterActive) return true;
    if (selectedIndicatorTypeSet.has(kr.goalType)) return true;
    if (selectedIndicatorTypeSet.has("external") && kr.measurementMode === "external") return true;
    if (selectedIndicatorTypeSet.has("linked_mission") && kr.measurementMode === "mission") return true;
    return false;
  }

  function taskStateMatches(task: MissionTask): boolean {
    if (!taskStateFilterActive) return true;
    if (selectedTaskState === "done") return task.isDone;
    if (selectedTaskState === "pending") return !task.isDone;
    return true;
  }

  function missionStatusMatches(mission: Mission): boolean {
    if (!missionStatusFilterActive) return true;
    return selectedMissionStatusSet.has(mission.status);
  }

  function filterTaskNode(task: MissionTask, missionScopeMatches: boolean): MissionTask | null {
    const directMatch =
      missionScopeMatches
      && (!itemTypeFilterActive || selectedItemTypeSet.has("task"))
      && !indicatorTypeFilterActive
      && !statusFilterActive
      && dateRangeMatches(task.dueDate, task.dueDate)
      && ownerMatches(task.owner)
      && taskContributionMatches(task)
      && taskStateMatches(task);

    return directMatch ? task : null;
  }

  function filterKeyResultNode(kr: KeyResult, missionScopeMatches: boolean): KeyResult | null {
    const nextChildren = (kr.children ?? [])
      .map((child) => filterKeyResultNode(child, missionScopeMatches))
      .filter((child): child is KeyResult => !!child);
    const nextTasks = (kr.tasks ?? [])
      .map((task) => filterTaskNode(task, missionScopeMatches))
      .filter((task): task is MissionTask => !!task);

    const directMatch =
      missionScopeMatches
      && (!itemTypeFilterActive || selectedItemTypeSet.has("indicator"))
      && !taskStateFilterActive
      && dateRangeMatches(kr.periodStart, kr.periodEnd)
      && ownerMatches(kr.owner)
      && (!statusFilterActive || kr.status === statusValue)
      && indicatorTypeMatches(kr)
      && keyResultContributionMatches(kr);

    if (!directMatch && nextChildren.length === 0 && nextTasks.length === 0) {
      return null;
    }

    return {
      ...kr,
      children: nextChildren.length > 0 ? nextChildren : kr.children ? [] : undefined,
      tasks: nextTasks.length > 0 ? nextTasks : kr.tasks ? [] : undefined,
    };
  }

  function filterMissionNode(mission: Mission): Mission | null {
    const missionTeamMatches = !teamFilterActive || ownerBelongsToSelectedTeam(mission.ownerId);
    const missionScopeMatches = missionTeamMatches && missionStatusMatches(mission);

    const nextChildren = (mission.children ?? [])
      .map((child) => filterMissionNode(child))
      .filter((child): child is Mission => !!child);
    const nextKeyResults = (mission.keyResults ?? [])
      .map((kr) => filterKeyResultNode(kr, missionScopeMatches))
      .filter((kr): kr is KeyResult => !!kr);
    const nextTasks = (mission.tasks ?? [])
      .map((task) => filterTaskNode(task, missionScopeMatches))
      .filter((task): task is MissionTask => !!task);

    const directMatch =
      missionScopeMatches
      && (!itemTypeFilterActive || selectedItemTypeSet.has("mission"))
      && !indicatorTypeFilterActive
      && !statusFilterActive
      && !taskStateFilterActive
      && dateRangeMatches(mission.dueDate, mission.dueDate)
      && ownerMatches(mission.owner)
      && missionContributionMatches(mission)
      && missionSupporterMatches(mission);

    if (!directMatch && nextChildren.length === 0 && nextKeyResults.length === 0 && nextTasks.length === 0) {
      return null;
    }

    return {
      ...mission,
      children: nextChildren.length > 0 ? nextChildren : mission.children ? [] : undefined,
      keyResults: nextKeyResults.length > 0 ? nextKeyResults : mission.keyResults ? [] : undefined,
      tasks: nextTasks.length > 0 ? nextTasks : mission.tasks ? [] : undefined,
    };
  }

  return missions
    .map((mission) => filterMissionNode(mission))
    .filter((mission): mission is Mission => !!mission);
}
