// ─── useTeamOverviewData ─────────────────────────────────────────────────────
// Hook que combina MissionsDataContext + PeopleDataContext + ActivityDataContext
// para montar os dados consolidados da Visão Geral do Time.
// Aceita um array de teamIds e um filtro de período opcional.

import { useMemo } from "react";
import { useMissionsData } from "@/contexts/MissionsDataContext";
import { usePeopleData } from "@/contexts/PeopleDataContext";
import { useActivityData } from "@/contexts/ActivityDataContext";
import { useSurveysData } from "@/contexts/SurveysDataContext";
import {
  buildAllMemberEngagements,
  aggregateTeamEngagement,
} from "@/lib/engagement-aggregation";
import type { UserEngagementSummary, TeamEngagementSummary } from "@/types/engagement";
import type { TeamMember } from "@/types";
import type { CheckIn } from "@/types";
import type { UserActivity } from "@/types/activity";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PeriodFilter {
  /** ISO date string "YYYY-MM-DD" (inclusive) */
  startDate: string | null;
  /** ISO date string "YYYY-MM-DD" (inclusive) */
  endDate: string | null;
}

export interface TeamOverviewData {
  teamIds: string[];
  teamNames: string[];
  memberCount: number;
  periodFilter: PeriodFilter | null;

  /** Resumos de engajamento/performance por membro, ordenados por criticidade */
  memberEngagements: UserEngagementSummary[];

  /** Métricas agregadas do time */
  teamEngagement: TeamEngagementSummary;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isoToTimestamp(date: string): number {
  return new Date(date).getTime();
}

/**
 * Filtra check-ins pelo período especificado.
 * Apenas check-ins com createdAt dentro do intervalo [startDate, endDate] são mantidos.
 */
function filterCheckInsByPeriod(
  checkInHistory: Record<string, CheckIn[]>,
  period: PeriodFilter,
): Record<string, CheckIn[]> {
  const start = period.startDate ? isoToTimestamp(period.startDate) : null;
  const end = period.endDate
    ? isoToTimestamp(period.endDate) + 86_400_000 - 1 // fim do dia
    : null;

  if (start === null && end === null) return checkInHistory;

  const filtered: Record<string, CheckIn[]> = {};
  for (const [krId, checkIns] of Object.entries(checkInHistory)) {
    const within = checkIns.filter((ci) => {
      const ts = isoToTimestamp(ci.createdAt);
      if (start !== null && ts < start) return false;
      if (end !== null && ts > end) return false;
      return true;
    });
    if (within.length > 0) filtered[krId] = within;
  }
  return filtered;
}

/**
 * Filtra atividades pelo período especificado.
 */
function filterActivitiesByPeriod(
  activities: UserActivity[],
  period: PeriodFilter,
): UserActivity[] {
  const start = period.startDate ? isoToTimestamp(period.startDate) : null;
  const end = period.endDate
    ? isoToTimestamp(period.endDate) + 86_400_000 - 1
    : null;

  if (start === null && end === null) return activities;

  return activities.filter((a) => {
    const ts = isoToTimestamp(a.createdAt);
    if (start !== null && ts < start) return false;
    if (end !== null && ts > end) return false;
    return true;
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTeamOverviewData(
  teamIds: string[],
  periodFilter?: PeriodFilter | null,
): TeamOverviewData {
  const { missions } = useMissionsData();
  // Phase 5: wire check-in history to useCheckIns per indicator once the
  // team overview drives its own queries. For now use an empty map so the
  // engagement aggregation degrades gracefully.
  const checkInHistory: Record<string, import("@/types").CheckIn[]> = {};
  const { teams } = usePeopleData();
  const { activities } = useActivityData();
  const { surveys } = useSurveysData();

  // Collect teams matching the given IDs
  const selectedTeams = useMemo(
    () => teams.filter((t) => teamIds.includes(t.id)),
    [teams, teamIds],
  );

  // Union of all members from selected teams, deduped by userId
  const members = useMemo<TeamMember[]>(() => {
    const seen = new Set<string>();
    const combined: TeamMember[] = [];
    for (const team of selectedTeams) {
      for (const m of team.members ?? []) {
        if (!seen.has(m.userId)) {
          seen.add(m.userId);
          combined.push(m);
        }
      }
    }
    return combined;
  }, [selectedTeams]);

  // Aplicar filtro de período sobre check-ins e atividades
  const filteredCheckInHistory = useMemo(() => {
    if (!periodFilter || (!periodFilter.startDate && !periodFilter.endDate)) {
      return checkInHistory;
    }
    return filterCheckInsByPeriod(checkInHistory, periodFilter);
  }, [checkInHistory, periodFilter]);

  const filteredActivities = useMemo(() => {
    if (!periodFilter || (!periodFilter.startDate && !periodFilter.endDate)) {
      return activities;
    }
    return filterActivitiesByPeriod(activities, periodFilter);
  }, [activities, periodFilter]);

  // IDs das pesquisas do time — surveys onde algum membro do time está em managerIds
  const memberUserIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members],
  );

  const teamSurveyIds = useMemo(
    () =>
      surveys
        .filter((s) => s.managerIds.some((id) => memberUserIds.has(id)))
        .map((s) => s.id),
    [surveys, memberUserIds],
  );

  const memberEngagements = useMemo(
    () =>
      buildAllMemberEngagements(
        members,
        missions,
        filteredCheckInHistory,
        filteredActivities,
        teamSurveyIds,
      ),
    [members, missions, filteredCheckInHistory, filteredActivities, teamSurveyIds],
  );

  const primaryTeamId = teamIds[0] ?? "";

  const teamEngagement = useMemo(
    () => aggregateTeamEngagement(primaryTeamId, memberEngagements, filteredCheckInHistory),
    [primaryTeamId, memberEngagements, filteredCheckInHistory],
  );

  const teamNames = useMemo(
    () => selectedTeams.map((t) => t.name),
    [selectedTeams],
  );

  return {
    teamIds,
    teamNames,
    memberCount: members.length,
    periodFilter: periodFilter ?? null,
    memberEngagements,
    teamEngagement,
  };
}
