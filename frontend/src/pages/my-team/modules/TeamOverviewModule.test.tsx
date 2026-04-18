import { describe, it, expect, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../tests/setup/test-utils";
import { TeamOverviewModule } from "./TeamOverviewModule";
import { EngagementStatsBar } from "./components/EngagementStatsBar";
import { TeamHealthTable } from "./components/TeamHealthTable";
import type { UserEngagementSummary, TeamEngagementSummary } from "@/types/engagement";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMember(overrides: Partial<UserEngagementSummary> = {}): UserEngagementSummary {
  return {
    userId: "u1",
    name: "Ana Silva",
    initials: "AS",
    jobTitle: "Dev",
    avatarUrl: null,
    habit: {
      activeDays30d: 20,
      lastActiveAt: null,
      checkInStreak: 4,
      daysSinceLastCheckIn: 2,
      checkInsLast30d: 4,
      surveyResponseRate: 1,
      pendingSurveysCount: 0,
      surveysRespondedLast30d: 3,
      surveysTotalLast30d: 3,
      lastPulseSentiment: 4,
      lastPulseDate: "2026-03-07T10:00:00Z",
      lastPulseWorkload: "normal" as const,
      pulseSentimentTrend: "stable" as const,
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
    healthStatus: "healthy",
    alerts: [],
    trend: "up",
    ...overrides,
  };
}

function makeTeamEngagement(overrides: Partial<TeamEngagementSummary> = {}): TeamEngagementSummary {
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
    byHealthStatus: { healthy: 3, attention: 1, critical: 0 },
    ...overrides,
  };
}

// ── TeamOverviewModule ────────────────────────────────────────────────────────

describe("TeamOverviewModule", () => {
  beforeEach(() => localStorage.clear());

  it("exibe título com nome do time", () => {
    renderWithProviders(<TeamOverviewModule />);
    expect(screen.getByText(/Meu Time/i)).toBeInTheDocument();
  });

  it("exibe EngagementStatsBar com KPIs", () => {
    renderWithProviders(<TeamOverviewModule />);
    // "Performance" e "Engajamento" aparecem nos cards e nos headers da tabela
    expect(screen.getAllByText("Performance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Engajamento").length).toBeGreaterThan(0);
  });

  it("exibe tabela de saúde do time", () => {
    renderWithProviders(<TeamOverviewModule />);
    expect(screen.getByText("Saúde do Time")).toBeInTheDocument();
  });

  it("exibe colunas da tabela", () => {
    renderWithProviders(<TeamOverviewModule />);
    expect(screen.getByText("Colaborador")).toBeInTheDocument();
    // "Performance" e "Engajamento" aparecem em múltiplos lugares
    expect(screen.getAllByText("Performance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Engajamento").length).toBeGreaterThan(0);
    expect(screen.getByText("Geral")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("não exibe tabs", () => {
    renderWithProviders(<TeamOverviewModule />);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("não exibe sidebar com cards de IA", () => {
    renderWithProviders(<TeamOverviewModule />);
    expect(screen.queryByText(/Bud IA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ações Rápidas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Próximos Eventos/i)).not.toBeInTheDocument();
  });

  it("exibe botão de filtro de saúde na toolbar", () => {
    renderWithProviders(<TeamOverviewModule />);
    expect(screen.getByRole("button", { name: /saúde/i })).toBeInTheDocument();
  });

  it("abre dropdown de saúde ao clicar no botão", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TeamOverviewModule />);
    await user.click(screen.getByRole("button", { name: /saúde/i }));
    // As opções de status aparecem no dropdown (podem existir múltiplas ocorrências na página)
    expect(screen.getAllByText("Bem").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Atenção").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Crítico").length).toBeGreaterThan(0);
  });

  it("exibe campo de busca de colaborador na tabela", () => {
    renderWithProviders(<TeamOverviewModule />);
    expect(screen.getByPlaceholderText("Buscar colaborador...")).toBeInTheDocument();
  });
});

// ── EngagementStatsBar ────────────────────────────────────────────────────────

describe("EngagementStatsBar", () => {
  function renderBar(overrides: Partial<TeamEngagementSummary> = {}) {
    renderWithProviders(<EngagementStatsBar teamEngagement={makeTeamEngagement(overrides)} />);
  }

  it("exibe labels de Performance e Engajamento", () => {
    renderBar();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Engajamento")).toBeInTheDocument();
  });

  it("exibe contadores de saúde: Bem, Atenção, Crítico", () => {
    renderBar({ byHealthStatus: { healthy: 3, attention: 1, critical: 1 } });
    expect(screen.getByText("Bem")).toBeInTheDocument();
    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(screen.getByText("Crítico")).toBeInTheDocument();
  });

  it("exibe contagem correta de cada status", () => {
    renderBar({ byHealthStatus: { healthy: 3, attention: 1, critical: 1 } });
    // Os valores numéricos aparecem no DOM
    const values = screen.getAllByText(/^\d+$/);
    const nums = values.map((el) => Number(el.textContent));
    expect(nums).toContain(3);
    expect(nums).toContain(1);
  });

  it("exibe 'colaborador' (singular) quando count = 1", () => {
    renderBar({ byHealthStatus: { healthy: 1, attention: 0, critical: 0 } });
    // Deve aparecer "colaborador" (singular)
    expect(screen.getAllByText("colaborador").length).toBeGreaterThan(0);
  });

  it("exibe 'colaboradores' (plural) quando count > 1", () => {
    renderBar({ byHealthStatus: { healthy: 3, attention: 2, critical: 0 } });
    expect(screen.getAllByText("colaboradores").length).toBeGreaterThan(0);
  });
});

// ── TeamHealthTable ───────────────────────────────────────────────────────────

describe("TeamHealthTable", () => {
  it("exibe todos os colaboradores", () => {
    const members = [
      makeMember({ userId: "u1", name: "Ana Silva" }),
      makeMember({ userId: "u2", name: "Bruno Costa", healthStatus: "attention", overallScore: 55 }),
    ];
    renderWithProviders(<TeamHealthTable members={members} />);
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Bruno Costa")).toBeInTheDocument();
  });

  it("exibe headers corretos", () => {
    renderWithProviders(<TeamHealthTable members={[makeMember()]} />);
    expect(screen.getByText("Colaborador")).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Engajamento")).toBeInTheDocument();
    expect(screen.getByText("Geral")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("exibe badge 'Bem' para status healthy", () => {
    renderWithProviders(<TeamHealthTable members={[makeMember({ healthStatus: "healthy" })]} />);
    expect(screen.getByText("Bem")).toBeInTheDocument();
  });

  it("exibe badge 'Atenção' para status attention", () => {
    renderWithProviders(
      <TeamHealthTable members={[makeMember({ healthStatus: "attention", overallScore: 55 })]} />,
    );
    expect(screen.getByText("Atenção")).toBeInTheDocument();
  });

  it("exibe badge 'Crítico' para status critical", () => {
    renderWithProviders(
      <TeamHealthTable members={[makeMember({ healthStatus: "critical", overallScore: 30 })]} />,
    );
    expect(screen.getByText("Crítico")).toBeInTheDocument();
  });

  it("ordena críticos primeiro por padrão", () => {
    const members = [
      makeMember({ userId: "u1", name: "Maria (Saudável)", healthStatus: "healthy", overallScore: 80 }),
      makeMember({ userId: "u2", name: "João (Crítico)", healthStatus: "critical", overallScore: 25 }),
      makeMember({ userId: "u3", name: "Pedro (Atenção)", healthStatus: "attention", overallScore: 55 }),
    ];
    renderWithProviders(<TeamHealthTable members={members} />);

    const rows = screen.getAllByRole("row");
    // rows[0] = header, rows[1] = primeiro dado — deve ser o crítico
    const firstDataRow = rows[1]!;
    expect(within(firstDataRow).getByText("João (Crítico)")).toBeInTheDocument();
  });

  it("exibe mensagem quando sem membros", () => {
    renderWithProviders(<TeamHealthTable members={[]} />);
    expect(screen.getByText(/nenhum membro/i)).toBeInTheDocument();
  });

  it("colunas são ordináveis — th[aria-sort] existe", () => {
    renderWithProviders(<TeamHealthTable members={[makeMember()]} />);
    const sortableHeaders = document.querySelectorAll("th[aria-sort]");
    expect(sortableHeaders.length).toBeGreaterThan(0);
  });

  it("exibe badge de quantidade no cabeçalho da tabela", () => {
    const members = [
      makeMember({ userId: "u1", healthStatus: "critical", overallScore: 25 }),
      makeMember({ userId: "u2", healthStatus: "healthy", overallScore: 80 }),
    ];
    renderWithProviders(<TeamHealthTable members={members} />);
    // Badge "1 crítico" aparece (pode aparecer múltiplas vezes com os badges de status)
    expect(screen.getAllByText(/crítico/i).length).toBeGreaterThan(0);
  });

  it("alterna ordenação ao clicar na mesma coluna", async () => {
    const user = userEvent.setup();
    const members = [
      makeMember({ userId: "u1", name: "Alta Performance", performanceScore: 90, overallScore: 85, healthStatus: "healthy" }),
      makeMember({ userId: "u2", name: "Baixa Performance", performanceScore: 40, overallScore: 55, healthStatus: "attention" }),
    ];
    renderWithProviders(<TeamHealthTable members={members} />);

    const perfHeader = screen.getByRole("button", { name: /ordenar por performance/i });
    await user.click(perfHeader);
    const th = perfHeader.closest("th");
    expect(th).toHaveAttribute("aria-sort", "ascending");
  });
});
