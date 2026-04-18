// ─── EngagementStatsBar ───────────────────────────────────────────────────────
// Barra de KPIs do time: 2 gauges (Performance, Engajamento) + 3 contadores
// de saúde (Bem, Atenção, Crítico).

import { TrendUp, TrendDown, ArrowRight, Info } from "@phosphor-icons/react";
import { Card, CardBody, CardHeader, GoalProgressBar, Tooltip } from "@getbud-co/buds";
import type { TeamEngagementSummary, TrendDirection } from "@/types/engagement";
import styles from "./EngagementStatsBar.module.css";

// ── Trend Icon ─────────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "up") return <TrendUp size={16} className={styles.trendUp} />;
  if (trend === "down") return <TrendDown size={16} className={styles.trendDown} />;
  return <ArrowRight size={16} className={styles.trendStable} />;
}

// ── Score Gauge ────────────────────────────────────────────────────────────────

interface ScoreGaugeProps {
  score: number;
  trend: TrendDirection;
  label: string;
  description: string;
}

const GAUGE_TOOLTIP: Record<string, string> = {
  Performance: "60% missões (progresso dos KRs) + 40% participação em pesquisas",
  Engajamento: "35% check-ins (streak e frequência) + 30% participação em pesquisas + 35% acessos",
};

function ScoreGauge({ score, trend, label, description }: ScoreGaugeProps) {
  const status =
    score >= 70 ? "on-track" : score >= 40 ? "attention" : "off-track";

  const tooltipText = GAUGE_TOOLTIP[label];

  return (
    <Card padding="sm">
      <CardHeader
        title={label}
        action={
          <div className={styles.gaugeActions}>
            {tooltipText && (
              <Tooltip content={tooltipText} placement="top">
                <Info size={16} className={styles.infoIcon} />
              </Tooltip>
            )}
            <TrendIcon trend={trend} />
          </div>
        }
      />
      <CardBody>
        <GoalProgressBar label={description} value={score} status={status} />
      </CardBody>
    </Card>
  );
}

// ── Health Counter ─────────────────────────────────────────────────────────────

interface HealthCounterProps {
  count: number;
  label: string;
  color: "good" | "warn" | "bad";
}

function HealthCounter({ count, label, color }: HealthCounterProps) {
  return (
    <Card padding="sm">
      <CardBody>
        <div className={styles.counterBody}>
          <span className={`${styles.counterValue} ${styles[color]}`}>
            {count}
          </span>
          <span className={styles.counterLabel}>{label}</span>
          <span className={styles.counterSub}>
            {count === 1 ? "colaborador" : "colaboradores"}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

// ── EngagementStatsBar ─────────────────────────────────────────────────────────

interface EngagementStatsBarProps {
  teamEngagement: TeamEngagementSummary;
}

export function EngagementStatsBar({ teamEngagement }: EngagementStatsBarProps) {
  const { byHealthStatus } = teamEngagement;

  return (
    <div className={styles.grid}>
      <ScoreGauge
        score={teamEngagement.avgPerformanceScore}
        trend={teamEngagement.performanceTrend}
        label="Performance"
        description="Missões e pesquisas"
      />
      <ScoreGauge
        score={teamEngagement.avgEngagementScore}
        trend={teamEngagement.engagementTrend}
        label="Engajamento"
        description="Check-ins e participação"
      />
      <HealthCounter
        count={byHealthStatus.healthy}
        label="Bem"
        color="good"
      />
      <HealthCounter
        count={byHealthStatus.attention}
        label="Atenção"
        color="warn"
      />
      <HealthCounter
        count={byHealthStatus.critical}
        label="Crítico"
        color="bad"
      />
    </div>
  );
}
