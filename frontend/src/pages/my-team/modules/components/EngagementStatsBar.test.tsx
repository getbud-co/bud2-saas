import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderMinimal } from "../../../../../tests/setup/test-utils";
import { EngagementStatsBar } from "./EngagementStatsBar";
import type { TeamEngagementSummary } from "@/types/engagement";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTeamEngagement(
  overrides: Partial<TeamEngagementSummary> = {},
): TeamEngagementSummary {
  return {
    teamId: "team-1",
    memberCount: 5,
    avgEngagementScore: 75,
    avgPerformanceScore: 70,
    engagementTrend: "up",
    performanceTrend: "stable",
    checkInRateThisWeek: 0.8,
    membersWithPendingSurveys: 1,
    membersInAlert: 0,
    byAlertLevel: { excellent: 2, good: 2, attention: 1, critical: 0 },
    byHealthStatus: { healthy: 3, attention: 1, critical: 1 },
    ...overrides,
  };
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("EngagementStatsBar", () => {
  beforeEach(() => localStorage.clear());

  it("renderiza sem erros", () => {
    expect(() =>
      renderMinimal(<EngagementStatsBar teamEngagement={makeTeamEngagement()} />),
    ).not.toThrow();
  });

  it("exibe label de Performance", () => {
    renderMinimal(<EngagementStatsBar teamEngagement={makeTeamEngagement()} />);
    expect(screen.getByText("Performance")).toBeInTheDocument();
  });

  it("exibe label de Engajamento", () => {
    renderMinimal(<EngagementStatsBar teamEngagement={makeTeamEngagement()} />);
    expect(screen.getByText("Engajamento")).toBeInTheDocument();
  });

  it("exibe descricao do gauge de Performance", () => {
    renderMinimal(<EngagementStatsBar teamEngagement={makeTeamEngagement()} />);
    expect(screen.getByText("Missões e pesquisas")).toBeInTheDocument();
  });

  it("exibe descricao do gauge de Engajamento", () => {
    renderMinimal(<EngagementStatsBar teamEngagement={makeTeamEngagement()} />);
    expect(screen.getByText("Check-ins e participação")).toBeInTheDocument();
  });

  it("exibe contadores de saude: Bem, Atencao, Critico", () => {
    renderMinimal(
      <EngagementStatsBar
        teamEngagement={makeTeamEngagement({
          byHealthStatus: { healthy: 3, attention: 1, critical: 1 },
        })}
      />,
    );
    expect(screen.getByText("Bem")).toBeInTheDocument();
    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(screen.getByText("Crítico")).toBeInTheDocument();
  });

  it("exibe contagem correta por status", () => {
    renderMinimal(
      <EngagementStatsBar
        teamEngagement={makeTeamEngagement({
          byHealthStatus: { healthy: 5, attention: 2, critical: 1 },
        })}
      />,
    );
    const values = screen.getAllByText(/^\d+$/).map((el) => Number(el.textContent));
    expect(values).toContain(5);
    expect(values).toContain(2);
    expect(values).toContain(1);
  });

  it("exibe 'colaborador' no singular quando count = 1", () => {
    renderMinimal(
      <EngagementStatsBar
        teamEngagement={makeTeamEngagement({
          byHealthStatus: { healthy: 1, attention: 0, critical: 0 },
        })}
      />,
    );
    expect(screen.getAllByText("colaborador").length).toBeGreaterThan(0);
  });

  it("exibe 'colaboradores' no plural quando count > 1", () => {
    renderMinimal(
      <EngagementStatsBar
        teamEngagement={makeTeamEngagement({
          byHealthStatus: { healthy: 3, attention: 0, critical: 0 },
        })}
      />,
    );
    expect(screen.getAllByText("colaboradores").length).toBeGreaterThan(0);
  });

  it("exibe zero para todos os contadores quando nao ha membros", () => {
    renderMinimal(
      <EngagementStatsBar
        teamEngagement={makeTeamEngagement({
          byHealthStatus: { healthy: 0, attention: 0, critical: 0 },
        })}
      />,
    );
    // Todos os contadores mostram 0 com "colaboradores" no plural
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it("renderiza com trend up para Performance", () => {
    renderMinimal(
      <EngagementStatsBar
        teamEngagement={makeTeamEngagement({ performanceTrend: "up" })}
      />,
    );
    // Nao deve lancar erros e os labels devem estar presentes
    expect(screen.getByText("Performance")).toBeInTheDocument();
  });

  it("renderiza com trend down para Engajamento", () => {
    renderMinimal(
      <EngagementStatsBar
        teamEngagement={makeTeamEngagement({ engagementTrend: "down" })}
      />,
    );
    expect(screen.getByText("Engajamento")).toBeInTheDocument();
  });

  it("renderiza com trend stable para ambos", () => {
    renderMinimal(
      <EngagementStatsBar
        teamEngagement={makeTeamEngagement({
          performanceTrend: "stable",
          engagementTrend: "stable",
        })}
      />,
    );
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Engajamento")).toBeInTheDocument();
  });
});
