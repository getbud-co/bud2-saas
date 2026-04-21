import { describe, it, expect } from "vitest";
import {
  aggregateTeamEngagement,
} from "./engagement-aggregation";
import type { CheckIn } from "@/types";
import type { UserActivity } from "@/types/activity";
import type { TeamMember } from "@/types/team";
import type { UserEngagementSummary } from "@/types/engagement";
import { today, addDays, toIsoDateTime } from "@/lib/seed-utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HABIT_DEFAULTS = {
  surveysRespondedLast30d: 3,
  surveysTotalLast30d: 3,
  lastPulseSentiment: 4 as number | null,
  lastPulseDate: "2026-03-07T10:00:00Z" as string | null,
  lastPulseWorkload: "normal" as "low" | "normal" | "high" | "overload" | null,
  pulseSentimentTrend: "stable" as "improving" | "stable" | "declining" | null,
};

function makeCheckIn(userId: string, daysAgo: number, confidence: CheckIn["confidence"] = "medium"): CheckIn {
  return {
    id: `ci-${userId}-${daysAgo}`,
    keyResultId: "kr-1",
    authorId: userId,
    value: "50",
    previousValue: null,
    confidence,
    note: null,
    mentions: null,
    createdAt: toIsoDateTime(addDays(today(), -daysAgo)),
  };
}

function makeActivity(
  userId: string,
  type: UserActivity["type"],
  daysAgo: number,
  overrides: Partial<UserActivity> = {},
): UserActivity {
  return {
    id: `act-${userId}-${type}-${daysAgo}`,
    userId,
    type,
    entityId: null,
    entityType: null,
    metadata: null,
    createdAt: toIsoDateTime(addDays(today(), -daysAgo)),
    ...overrides,
  };
}

function makeTeamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    teamId: "team-1",
    userId: "u1",
    roleInTeam: "member",
    joinedAt: "2025-01-01T00:00:00Z",
    user: {
      id: "u1",
      firstName: "Ana",
      lastName: "Silva",
      initials: "AS",
      jobTitle: "Dev",
      avatarUrl: null,
    },
    ...overrides,
  };
}

function makeMemberEngagement(overrides: Partial<UserEngagementSummary> = {}): UserEngagementSummary {
  return {
    userId: "u1",
    name: "Ana Silva",
    initials: "AS",
    avatarUrl: null,
    jobTitle: "Dev",
    habit: {
      activeDays30d: 20,
      lastActiveAt: null,
      checkInStreak: 4,
      daysSinceLastCheckIn: 2,
      checkInsLast30d: 4,
      surveyResponseRate: 1,
      pendingSurveysCount: 0,
      ...HABIT_DEFAULTS,
    },
    performance: {
      krsCompletedRate: 0.75,
      avgProgress: 70,
      avgConfidence: "high",
      activeKRsCount: 4,
      completedKRsCount: 3,
      avgSurveyResponseTimeHours: 12,
    },
    engagementScore: 85,
    performanceScore: 80,
    overallScore: 83,
    alertLevel: "excellent",
    healthStatus: "healthy" as const,
    alerts: [],
    trend: "up",
    ...overrides,
  };
}

// ── aggregateTeamEngagement ───────────────────────────────────────────────────

describe("aggregateTeamEngagement", () => {
  it("retorna zeros para time vazio", () => {
    const result = aggregateTeamEngagement("team-1", [], {});
    expect(result.memberCount).toBe(0);
    expect(result.avgEngagementScore).toBe(0);
    expect(result.byHealthStatus).toEqual({ healthy: 0, attention: 0, critical: 0 });
  });

  it("calcula médias corretamente", () => {
    const members = [
      makeMemberEngagement({ engagementScore: 80, performanceScore: 70 }),
      makeMemberEngagement({ userId: "u2", engagementScore: 60, performanceScore: 50 }),
    ];
    const result = aggregateTeamEngagement("team-1", members, {});
    expect(result.avgEngagementScore).toBe(70);
    expect(result.avgPerformanceScore).toBe(60);
  });

  it("conta membros por nível de alerta (alertLevel)", () => {
    const members = [
      makeMemberEngagement({ alertLevel: "excellent", healthStatus: "healthy" }),
      makeMemberEngagement({ userId: "u2", alertLevel: "critical", healthStatus: "critical", overallScore: 25 }),
      makeMemberEngagement({ userId: "u3", alertLevel: "attention", healthStatus: "attention", overallScore: 55 }),
    ];
    const result = aggregateTeamEngagement("team-1", members, {});
    expect(result.byAlertLevel.excellent).toBe(1);
    expect(result.byAlertLevel.critical).toBe(1);
    expect(result.byAlertLevel.attention).toBe(1);
    expect(result.membersInAlert).toBe(1);
  });

  it("conta membros por status de saúde (byHealthStatus)", () => {
    const members = [
      makeMemberEngagement({ healthStatus: "healthy", overallScore: 80 }),
      makeMemberEngagement({ userId: "u2", healthStatus: "critical", overallScore: 25 }),
      makeMemberEngagement({ userId: "u3", healthStatus: "attention", overallScore: 55 }),
    ];
    const result = aggregateTeamEngagement("team-1", members, {});
    expect(result.byHealthStatus.healthy).toBe(1);
    expect(result.byHealthStatus.critical).toBe(1);
    expect(result.byHealthStatus.attention).toBe(1);
  });

  it("conta membros com pesquisas pendentes", () => {
    const members = [
      makeMemberEngagement({ habit: { ...HABIT_DEFAULTS, activeDays30d: 20, lastActiveAt: null, checkInStreak: 4, daysSinceLastCheckIn: 2, checkInsLast30d: 4, surveyResponseRate: 1, pendingSurveysCount: 0 } }),
      makeMemberEngagement({ userId: "u2", habit: { ...HABIT_DEFAULTS, activeDays30d: 10, lastActiveAt: null, checkInStreak: 1, daysSinceLastCheckIn: 5, checkInsLast30d: 2, surveyResponseRate: 0.5, pendingSurveysCount: 2 } }),
    ];
    const result = aggregateTeamEngagement("team-1", members, {});
    expect(result.membersWithPendingSurveys).toBe(1);
  });
});
