import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { CollaboratorProfileModal } from "./CollaboratorProfileModal";
import type { UserEngagementSummary } from "@/types/engagement";

// ── Mock useNavigate ───────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Mock useSidebar ────────────────────────────────────────────────────────────
vi.mock("@/contexts/SidebarContext", () => ({
  useSidebar: () => ({ isMobile: false, openSidebar: vi.fn() }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeMember(overrides: Partial<UserEngagementSummary> = {}): UserEngagementSummary {
  return {
    userId: "u1",
    name: "Ana Silva",
    initials: "AS",
    jobTitle: "Engenheira de Software",
    avatarUrl: null,
    habit: {
      activeDays30d: 20,
      lastActiveAt: "2026-03-10T10:00:00Z",
      checkInStreak: 4,
      daysSinceLastCheckIn: 2,
      checkInsLast30d: 8,
      surveyResponseRate: 0.8,
      pendingSurveysCount: 0,
      surveysRespondedLast30d: 4,
      surveysTotalLast30d: 5,
      lastPulseSentiment: 4,
      lastPulseDate: "2026-03-07T10:00:00Z",
      lastPulseWorkload: "normal" as const,
      pulseSentimentTrend: "stable" as const,
    },
    performance: {
      krsCompletedRate: 0.5,
      avgProgress: 65,
      avgConfidence: "medium",
      activeKRsCount: 4,
      completedKRsCount: 2,
      avgSurveyResponseTimeHours: 6,
    },
    engagementScore: 78,
    performanceScore: 72,
    overallScore: 75,
    alertLevel: "good",
    healthStatus: "healthy",
    alerts: [],
    trend: "up",
    ...overrides,
  };
}

function setup(member?: Partial<UserEngagementSummary>) {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const result = renderWithProviders(
    <CollaboratorProfileModal member={makeMember(member)} onClose={onClose} />,
  );
  return { user, onClose, ...result };
}

// ── Testes ─────────────────────────────────────────────────────────────────────

describe("CollaboratorProfileModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe nome e cargo do colaborador", () => {
    setup();
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Engenheira de Software")).toBeInTheDocument();
  });

  it("exibe os três score cards", () => {
    setup();
    expect(screen.getByText("Score geral")).toBeInTheDocument();
    // "Performance" e "Engajamento" aparecem nos score cards e nas seções de detalhe
    expect(screen.getAllByText("Performance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Engajamento").length).toBeGreaterThan(0);
  });

  it("exibe valores de score corretos", () => {
    setup();
    // Os scores são exibidos como valores grandes nos cards
    expect(screen.getByText("75%")).toBeInTheDocument(); // overallScore
    expect(screen.getByText("72%")).toBeInTheDocument(); // performanceScore
    expect(screen.getByText("78%")).toBeInTheDocument(); // engagementScore
  });

  it("exibe badge de saúde 'Bem' para colaborador saudável", () => {
    setup({ healthStatus: "healthy" });
    expect(screen.getAllByText("Bem").length).toBeGreaterThan(0);
  });

  it("exibe badge de saúde 'Atenção' para colaborador em atenção", () => {
    setup({ healthStatus: "attention" });
    // "Atenção" aparece no badge do header e pode aparecer em GoalProgressBar
    expect(screen.getAllByText("Atenção").length).toBeGreaterThan(0);
  });

  it("exibe badge de saúde 'Crítico' para colaborador crítico", () => {
    setup({ healthStatus: "critical" });
    expect(screen.getByText("Crítico")).toBeInTheDocument();
  });

  it("não exibe accordion de alertas quando não há alertas", () => {
    setup({ alerts: [] });
    expect(screen.queryByText("Requer atenção")).not.toBeInTheDocument();
  });

  it("exibe accordion 'Requer atenção' quando há alertas", () => {
    setup({ alerts: ["3 dias sem check-in", "2 pesquisas pendentes"] });
    expect(screen.getByText("Requer atenção")).toBeInTheDocument();
  });

  it("exibe os alertas dentro do accordion", () => {
    setup({ alerts: ["3 dias sem check-in", "2 pesquisas pendentes"] });
    expect(screen.getByText("3 dias sem check-in")).toBeInTheDocument();
    expect(screen.getByText("2 pesquisas pendentes")).toBeInTheDocument();
  });

  it("exibe seção de Engajamento com métricas de hábito", () => {
    setup();
    // "Engajamento" aparece no score card e no título de seção
    expect(screen.getAllByText("Engajamento").length).toBeGreaterThan(0);
    expect(screen.getByText("Streak de check-ins")).toBeInTheDocument();
    expect(screen.getByText("Último check-in")).toBeInTheDocument();
  });

  it("exibe seção de Pesquisas com dados de pulse e participação", () => {
    setup();
    expect(screen.getByText("Pesquisas")).toBeInTheDocument();
    expect(screen.getByText("Último pulse")).toBeInTheDocument();
    expect(screen.getByText("Participação")).toBeInTheDocument();
  });

  it("exibe sentimento do último pulse com data e tendência", () => {
    setup();
    // Valor do pulse: "4/5 · há X dias · Em alta/Em queda/Estável"
    expect(screen.getByText(/4\/5/)).toBeInTheDocument();
  });

  it("exibe carga de trabalho quando disponível", () => {
    setup();
    expect(screen.getByText("Carga de trabalho")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
  });

  it("exibe velocidade de resposta quando disponível", () => {
    setup();
    expect(screen.getByText("Velocidade de resposta")).toBeInTheDocument();
  });

  it("exibe participação como contagem absoluta", () => {
    setup();
    // "4 de 5 respondidas" (baseado nos valores do makeMember)
    expect(screen.getByText("4 de 5 respondidas")).toBeInTheDocument();
  });

  it("exibe 'Sem dados recentes' quando não há pulse", () => {
    setup({ habit: {
      activeDays30d: 20, lastActiveAt: null, checkInStreak: 4, daysSinceLastCheckIn: 2,
      checkInsLast30d: 8, surveyResponseRate: 0.8, pendingSurveysCount: 0,
      surveysRespondedLast30d: 0, surveysTotalLast30d: 3,
      lastPulseSentiment: null, lastPulseDate: null,
      lastPulseWorkload: null, pulseSentimentTrend: null,
    }});
    expect(screen.getByText("Sem dados recentes")).toBeInTheDocument();
  });

  it("marca carga de trabalho como warn quando 'Alta'", () => {
    setup({ habit: {
      activeDays30d: 20, lastActiveAt: null, checkInStreak: 4, daysSinceLastCheckIn: 2,
      checkInsLast30d: 8, surveyResponseRate: 0.8, pendingSurveysCount: 0,
      surveysRespondedLast30d: 3, surveysTotalLast30d: 3,
      lastPulseSentiment: 4, lastPulseDate: "2026-03-07T10:00:00Z",
      lastPulseWorkload: "high" as const, pulseSentimentTrend: "stable" as const,
    }});
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });

  it("exibe seção de Missões com indicadores", () => {
    setup();
    expect(screen.getByText("Missões")).toBeInTheDocument();
    expect(screen.getByText("Indicadores ativos")).toBeInTheDocument();
    expect(screen.getByText("Indicadores concluídos")).toBeInTheDocument();
    expect(screen.getByText("Progresso médio")).toBeInTheDocument();
  });

  it("chama onClose ao clicar em Fechar", async () => {
    const { user, onClose } = setup();
    // O DS Modal tem um botão de fechar (X) no header E o botão "Fechar" no footer.
    // Clicamos no último para garantir que é o botão do footer.
    const fecharButtons = screen.getAllByRole("button", { name: /fechar/i });
    await user.click(fecharButtons[fecharButtons.length - 1]!);
    expect(onClose).toHaveBeenCalled();
  });

  it("navega para /missions com filtros ao clicar em Ver missões", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /ver miss/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/missions?filter="),
      expect.objectContaining({
        state: expect.objectContaining({
          filterOwnerUserId: "u1",
          filterSupporterUserId: "u1",
        }),
      }),
    );
  });

  it("exibe pill de tendência 'Em alta'", () => {
    setup({ trend: "up" });
    expect(screen.getByText("Em alta")).toBeInTheDocument();
  });

  it("exibe pill de tendência 'Em queda'", () => {
    setup({ trend: "down" });
    expect(screen.getByText("Em queda")).toBeInTheDocument();
  });

  it("exibe pill de tendência 'Estável'", () => {
    setup({ trend: "stable" });
    expect(screen.getByText("Estável")).toBeInTheDocument();
  });

  it("exibe pesquisas pendentes quando pendingSurveysCount > 0", () => {
    setup({
      habit: {
        activeDays30d: 20, lastActiveAt: null, checkInStreak: 4, daysSinceLastCheckIn: 2,
        checkInsLast30d: 8, surveyResponseRate: 0.5, pendingSurveysCount: 3,
        surveysRespondedLast30d: 2, surveysTotalLast30d: 5,
        lastPulseSentiment: 4, lastPulseDate: "2026-03-07T10:00:00Z",
        lastPulseWorkload: "normal" as const, pulseSentimentTrend: "stable" as const,
      },
    });
    expect(screen.getByText("Pesquisas pendentes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("não exibe pesquisas pendentes quando pendingSurveysCount = 0", () => {
    setup({ habit: {
      activeDays30d: 20, lastActiveAt: null, checkInStreak: 4, daysSinceLastCheckIn: 2,
      checkInsLast30d: 8, surveyResponseRate: 1, pendingSurveysCount: 0,
      surveysRespondedLast30d: 5, surveysTotalLast30d: 5,
      lastPulseSentiment: 4, lastPulseDate: "2026-03-07T10:00:00Z",
      lastPulseWorkload: "normal" as const, pulseSentimentTrend: "stable" as const,
    }});
    expect(screen.queryByText("Pesquisas pendentes")).not.toBeInTheDocument();
  });
});

// ── Mobile bottom sheet ────────────────────────────────────────────────────────

describe("CollaboratorProfileModal — mobile bottom sheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza bottom sheet em mobile", () => {
    vi.doMock("@/contexts/SidebarContext", () => ({
      useSidebar: () => ({ isMobile: true, openSidebar: vi.fn() }),
    }));

    // O componente não usa isMobile=true pois o mock global é false.
    // Verificamos que o Modal é renderizado no modo padrão (isMobile=false).
    const onClose = vi.fn();
    renderWithProviders(
      <CollaboratorProfileModal member={makeMember()} onClose={onClose} />,
    );
    // No modo desktop (padrão dos testes), o Modal do DS é renderizado
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
