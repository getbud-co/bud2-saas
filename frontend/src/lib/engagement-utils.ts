// ─── Engagement Utils ─────────────────────────────────────────────────────────
// Utilitários puros para cálculo de métricas de engajamento.
// Extraídos de useTeamHealthReadModel e useEngagementReadModel para evitar
// duplicação e permitir uso em testes e fora de componentes React.

import type { Mission, CheckIn } from "@/types";
import { today, addWeeks, startOfWeek, addDays, hashString } from "@/lib/seed-utils";

// ── Missões ───────────────────────────────────────────────────────────────────

/**
 * Achata a hierarquia de missões em uma lista plana.
 */
export function flattenMissions(missions: Mission[]): Mission[] {
  const flat: Mission[] = [];
  for (const mission of missions) {
    flat.push(mission);
    if (mission.children?.length) {
      flat.push(...flattenMissions(mission.children));
    }
  }
  return flat;
}

/**
 * Retorna IDs de todos os usuários que são owners de KRs.
 */
export function getKrOwnerIds(missions: Mission[]): Set<string> {
  const ownerIds = new Set<string>();
  const allMissions = flattenMissions(missions);
  for (const mission of allMissions) {
    for (const kr of mission.keyResults ?? []) {
      if (kr.owner?.id) ownerIds.add(kr.owner.id);
    }
  }
  return ownerIds;
}

/**
 * Calcula o progresso médio de KRs por owner.
 * Retorna um Map de userId → { total, count }.
 */
export function getProgressByOwner(
  missions: Mission[],
): Map<string, { total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  const allMissions = flattenMissions(missions);
  for (const mission of allMissions) {
    for (const kr of mission.keyResults ?? []) {
      if (kr.owner?.id) {
        const current = map.get(kr.owner.id) ?? { total: 0, count: 0 };
        current.total += kr.progress;
        current.count += 1;
        map.set(kr.owner.id, current);
      }
    }
  }
  return map;
}

// ── Check-ins ─────────────────────────────────────────────────────────────────

/**
 * Calcula quantos dias se passaram desde o último check-in do usuário.
 * Retorna 14 se não houver nenhum check-in.
 */
export function daysSinceUserCheckin(
  userId: string,
  checkInHistory: Record<string, CheckIn[]>,
): number {
  const now = today();
  let latestCheckIn: Date | null = null;

  for (const checkIns of Object.values(checkInHistory)) {
    for (const checkIn of checkIns) {
      if (checkIn.authorId === userId) {
        const checkInDate = new Date(checkIn.createdAt);
        if (!latestCheckIn || checkInDate > latestCheckIn) {
          latestCheckIn = checkInDate;
        }
      }
    }
  }

  if (!latestCheckIn) return 14;

  const diffMs = now.getTime() - latestCheckIn.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Formata dias atrás em português.
 */
export function formatDaysAgo(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

/**
 * Conta o número de check-ins feitos por um usuário nos últimos N dias.
 */
export function countCheckInsForUser(
  userId: string,
  checkInHistory: Record<string, CheckIn[]>,
  days: number = 30,
): number {
  const cutoff = addDays(today(), -days);
  let count = 0;
  for (const checkIns of Object.values(checkInHistory)) {
    for (const checkIn of checkIns) {
      if (checkIn.authorId === userId && new Date(checkIn.createdAt) >= cutoff) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Calcula a streak (semanas consecutivas com pelo menos 1 check-in) de um usuário.
 * Conta para trás a partir da semana atual.
 */
export function calculateCheckInStreakForUser(
  userId: string,
  checkInHistory: Record<string, CheckIn[]>,
  maxWeeks: number = 12,
): number {
  const now = today();
  const weekStart = startOfWeek(now);

  let streak = 0;

  for (let i = 0; i < maxWeeks; i++) {
    const wStart = addWeeks(weekStart, -i);
    const wEnd = addWeeks(wStart, 1);

    const hasCheckIn = Object.values(checkInHistory).some((checkIns) =>
      checkIns.some((ci) => {
        if (ci.authorId !== userId) return false;
        const d = new Date(ci.createdAt);
        return d >= wStart && d < wEnd;
      }),
    );

    if (!hasCheckIn && i > 0) break; // Para na primeira semana sem check-in (exceto semana atual)
    if (hasCheckIn) streak++;
    else if (i === 0) continue; // Semana atual ainda pode estar em andamento
  }

  return streak;
}

// ── Engajamento geral ─────────────────────────────────────────────────────────

/**
 * Calcula o percentual de KRs com check-ins (proxy de missions engagement).
 */
export function calculateMissionsEngagement(
  missions: Mission[],
  checkInHistory: Record<string, unknown[]>,
): number {
  const allMissions = flattenMissions(missions);
  let totalKrs = 0;
  let krsWithCheckins = 0;

  for (const mission of allMissions) {
    for (const kr of mission.keyResults ?? []) {
      totalKrs++;
      const checkIns = checkInHistory[kr.id] ?? [];
      if (checkIns.length > 0) krsWithCheckins++;
    }
  }

  if (totalKrs === 0) return 50;
  return Math.round((krsWithCheckins / totalKrs) * 100);
}

/**
 * Calcula o engajamento médio de pesquisas com base na completion rate.
 */
export function calculateSurveyEngagement(
  surveys: Array<{ status: string; completionRate: number }>,
): number {
  const activeSurveys = surveys.filter(
    (s) => s.status === "active" || s.status === "scheduled",
  );
  if (activeSurveys.length === 0) return 70;
  const totalCompletion = activeSurveys.reduce((sum, s) => sum + (s.completionRate ?? 0), 0);
  return Math.round(totalCompletion / activeSurveys.length);
}

/**
 * Calcula tendência global de check-ins (últimas 2 semanas vs 2-4 semanas atrás).
 */
export function calculateTrend(
  checkInHistory: Record<string, CheckIn[]>,
): { value: number; direction: "up" | "down" } {
  const now = today();
  const twoWeeksAgo = addWeeks(now, -2);
  const fourWeeksAgo = addWeeks(now, -4);

  let recentCount = 0;
  let olderCount = 0;

  for (const checkIns of Object.values(checkInHistory)) {
    for (const checkIn of checkIns) {
      const checkInDate = new Date(checkIn.createdAt);
      if (checkInDate >= twoWeeksAgo) recentCount++;
      else if (checkInDate >= fourWeeksAgo) olderCount++;
    }
  }

  const baseline = olderCount || 1;
  const changePercent = ((recentCount - olderCount) / baseline) * 100;
  const trend = Math.round(Math.abs(changePercent) * 10) / 100;

  return {
    value: Math.min(trend, 15),
    direction: recentCount >= olderCount ? "up" : "down",
  };
}

/**
 * Calcula tendência de um usuário nas últimas 4 semanas.
 * Compara check-ins recentes (2 semanas) vs anteriores (2-4 semanas).
 */
export function calculateUserTrend(
  userId: string,
  checkInHistory: Record<string, CheckIn[]>,
): "up" | "down" | "stable" {
  const now = today();
  const twoWeeksAgo = addWeeks(now, -2);
  const fourWeeksAgo = addWeeks(now, -4);

  let recentCount = 0;
  let olderCount = 0;

  for (const checkIns of Object.values(checkInHistory)) {
    for (const checkIn of checkIns) {
      if (checkIn.authorId !== userId) continue;
      const d = new Date(checkIn.createdAt);
      if (d >= twoWeeksAgo) recentCount++;
      else if (d >= fourWeeksAgo) olderCount++;
    }
  }

  if (recentCount > olderCount) return "up";
  if (recentCount < olderCount) return "down";
  return "stable";
}

/**
 * Calcula engajamento por pessoa com base na atividade de check-in.
 * Retorna valor 0-100 + trend.
 */
export function calculatePersonEngagement(
  userId: string,
  checkInHistory: Record<string, CheckIn[]>,
  krOwnerIds: Set<string>,
): { value: number; trend: number; trendDirection: "up" | "down" } {
  const hasKrs = krOwnerIds.has(userId);
  const baseEngagement = hasKrs ? 60 : 40;

  let totalCheckIns = 0;
  let recentCheckIns = 0;
  const twoWeeksAgo = addWeeks(today(), -2);

  for (const checkIns of Object.values(checkInHistory)) {
    for (const checkIn of checkIns) {
      if (checkIn.authorId === userId) {
        totalCheckIns++;
        if (new Date(checkIn.createdAt) >= twoWeeksAgo) recentCheckIns++;
      }
    }
  }

  const activityBonus = Math.min(totalCheckIns * 5, 30);
  const value = Math.min(100, baseEngagement + activityBonus);

  // Trend determinístico baseado no hash do userId
  const hash = hashString(userId);
  const trendBase = (hash % 100) / 10 - 3; // -3 a 7
  const trend = Math.abs(Math.round(trendBase * 10) / 10);
  const trendDirection = trendBase >= 0 ? ("up" as const) : ("down" as const);

  return { value, trend, trendDirection };
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Gera dados de engajamento agrupados por período.
 * Adapta automaticamente: semanas (≤12 semanas), meses (>12 semanas).
 */
export function generateWeeklyEngagementData(
  checkInHistory: Record<string, CheckIn[]>,
  userIds?: Set<string>,
  period?: { startDate: string | null; endDate: string | null } | null,
): Array<{ week: string; engajamento: number; missoes: number; pulso: number }> {
  const rangeEnd = period?.endDate ? new Date(period.endDate) : today();
  const rangeStart = period?.startDate ? new Date(period.startDate) : addWeeks(rangeEnd, -7);

  const totalDays = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)));
  const useMonths = totalDays > 90; // >3 meses → agrupar por mês

  if (useMonths) {
    return generateMonthlyData(checkInHistory, rangeStart, rangeEnd, userIds);
  }
  return generateWeeklyData(checkInHistory, rangeStart, rangeEnd, userIds);
}

function generateWeeklyData(
  checkInHistory: Record<string, CheckIn[]>,
  rangeStart: Date,
  rangeEnd: Date,
  userIds?: Set<string>,
): Array<{ week: string; engajamento: number; missoes: number; pulso: number }> {
  const data: Array<{ week: string; engajamento: number; missoes: number; pulso: number }> = [];

  let cursor = startOfWeek(rangeStart);
  const end = rangeEnd;
  let index = 0;

  while (cursor < end) {
    const weekEnd = addWeeks(cursor, 1);
    const dd = String(cursor.getDate()).padStart(2, "0");
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");

    const checkIns = countCheckInsInRange(checkInHistory, cursor, weekEnd, userIds);

    const baseEngajamento = 55 + index * 2;
    const baseMissoes = 40 + checkIns * 8 + index * 2;
    const basePulso = 60 + index * 2;

    data.push({
      week: `${dd}/${mm}`,
      engajamento: Math.min(100, baseEngajamento),
      missoes: Math.min(100, baseMissoes),
      pulso: Math.min(100, basePulso),
    });

    cursor = weekEnd;
    index++;
  }

  return data;
}

function generateMonthlyData(
  checkInHistory: Record<string, CheckIn[]>,
  rangeStart: Date,
  rangeEnd: Date,
  userIds?: Set<string>,
): Array<{ week: string; engajamento: number; missoes: number; pulso: number }> {
  const data: Array<{ week: string; engajamento: number; missoes: number; pulso: number }> = [];

  let year = rangeStart.getFullYear();
  let month = rangeStart.getMonth();
  let index = 0;

  while (true) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);

    if (monthStart > rangeEnd) break;

    const checkIns = countCheckInsInRange(checkInHistory, monthStart, monthEnd, userIds);

    const baseEngajamento = 55 + index * 3;
    const baseMissoes = 40 + checkIns * 4 + index * 2;
    const basePulso = 60 + index * 2;

    data.push({
      week: `${MONTH_NAMES[month]} ${year}`,
      engajamento: Math.min(100, baseEngajamento),
      missoes: Math.min(100, baseMissoes),
      pulso: Math.min(100, basePulso),
    });

    month++;
    if (month > 11) { month = 0; year++; }
    index++;
  }

  return data;
}

function countCheckInsInRange(
  checkInHistory: Record<string, CheckIn[]>,
  start: Date,
  end: Date,
  userIds?: Set<string>,
): number {
  let count = 0;
  for (const checkIns of Object.values(checkInHistory)) {
    for (const checkIn of checkIns) {
      if (userIds && !userIds.has(checkIn.authorId)) continue;
      const d = new Date(checkIn.createdAt);
      if (d >= start && d < end) count++;
    }
  }
  return count;
}
