// ─── Engagement Types ─────────────────────────────────────────────────────────
// Tipos para métricas de hábito, performance e engajamento de colaboradores.

import type { ConfidenceLevel } from "./check-in";

// ── Enums e literais ──────────────────────────────────────────────────────────

/** Nível de alerta/semáforo por colaborador (4 níveis — legado) */
export type AlertLevel = "excellent" | "good" | "attention" | "critical";

/** Status de saúde simplificado (3 níveis) — usado na visão do gestor */
export type HealthStatus = "healthy" | "attention" | "critical";

/** Direção da tendência */
export type TrendDirection = "up" | "down" | "stable";

// ── Métricas de Hábito ────────────────────────────────────────────────────────

/**
 * Métricas comportamentais que indicam se o colaborador está usando a plataforma
 * de forma consistente.
 */
export interface UserHabitMetrics {
  // Frequência de acesso (mock por agora — TODO: integrar com auth real)
  activeDays30d: number;
  lastActiveAt: string | null;

  // Check-ins
  checkInStreak: number;       // Semanas consecutivas com check-in
  daysSinceLastCheckIn: number;
  checkInsLast30d: number;

  // Pesquisas — participação
  surveyResponseRate: number;  // 0-1 (% de pesquisas respondidas)
  pendingSurveysCount: number;
  surveysRespondedLast30d: number;  // contagem absoluta respondidas
  surveysTotalLast30d: number;      // total disponível no período

  // Pulse insights (apenas de pesquisas não-anônimas — null se sem dados)
  lastPulseSentiment: number | null;   // 1–5, sentimento geral da última resposta
  lastPulseDate: string | null;        // ISO datetime da última resposta de pulse
  lastPulseWorkload: "low" | "normal" | "high" | "overload" | null;
  pulseSentimentTrend: "improving" | "stable" | "declining" | null;
}

// ── Métricas de Performance ───────────────────────────────────────────────────

/**
 * Métricas de entrega e resultado do colaborador.
 */
export interface UserPerformanceMetrics {
  // Metas
  krsCompletedRate: number;    // 0-1, no ciclo atual
  avgProgress: number;         // 0-100
  avgConfidence: ConfidenceLevel | null;
  activeKRsCount: number;
  completedKRsCount: number;

  // Tempo médio de resposta a pesquisas (null se não há dados)
  avgSurveyResponseTimeHours: number | null;
}

// ── Resumo por Colaborador ────────────────────────────────────────────────────

/**
 * Resumo completo de engajamento de um colaborador para exibição no painel do gestor.
 */
export interface UserEngagementSummary {
  userId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  jobTitle: string | null;

  habit: UserHabitMetrics;
  performance: UserPerformanceMetrics;

  // Scores compostos (0-100)
  engagementScore: number;
  performanceScore: number;

  /** Média ponderada 50/50 de engagement + performance */
  overallScore: number;

  // Status
  alertLevel: AlertLevel;
  /** Status de saúde derivado do overallScore (≥70 = healthy, ≥40 = attention, <40 = critical) */
  healthStatus: HealthStatus;
  alerts: string[];   // Ex: ["3 dias sem check-in", "2 pesquisas pendentes"]
  trend: TrendDirection;
}

// ── Resumo do Time ────────────────────────────────────────────────────────────

/**
 * Métricas agregadas do time para exibição na barra de stats.
 */
export interface TeamEngagementSummary {
  teamId: string;
  memberCount: number;

  // Scores médios
  avgEngagementScore: number;
  avgPerformanceScore: number;

  // Tendências (comparando últimas 4 semanas)
  engagementTrend: TrendDirection;
  performanceTrend: TrendDirection;

  // Métricas de hábito do time
  checkInRateThisWeek: number;          // 0-1 (% do time com check-in essa semana)
  membersWithPendingSurveys: number;    // Contagem de membros com pesquisas pendentes
  membersInAlert: number;               // alertLevel = "critical"

  // Breakdown por nível de alerta (4 níveis — legado)
  byAlertLevel: Record<AlertLevel, number>;

  // Breakdown por status de saúde (3 níveis)
  byHealthStatus: Record<HealthStatus, number>;
}
