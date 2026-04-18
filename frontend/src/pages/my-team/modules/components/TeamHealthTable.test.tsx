import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderMinimal } from "../../../../../tests/setup/test-utils";
import { TeamHealthTable } from "./TeamHealthTable";
import type { UserEngagementSummary } from "@/types/engagement";

// ── Helpers ────────────────────────────────────────────────────────────────────

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

const MEMBERS = {
  critical: makeMember({ userId: "u-c", name: "Carlos Crítico", healthStatus: "critical", overallScore: 30 }),
  attention: makeMember({ userId: "u-a", name: "Beatriz Atenção", healthStatus: "attention", overallScore: 55 }),
  healthy: makeMember({ userId: "u-h", name: "Ana Silva", healthStatus: "healthy", overallScore: 75 }),
};

// ── Testes ─────────────────────────────────────────────────────────────────────

describe("TeamHealthTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exibe mensagem de estado vazio quando não há membros", () => {
    renderMinimal(<TeamHealthTable members={[]} />);
    expect(screen.getByText(/nenhum membro encontrado/i)).toBeInTheDocument();
  });

  it("exibe cabeçalhos de coluna", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy]} />);
    expect(screen.getByText("Colaborador")).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Engajamento")).toBeInTheDocument();
    expect(screen.getByText("Geral")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("exibe nome do colaborador na tabela", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy]} />);
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
  });

  it("exibe badge 'Bem' para membro saudável", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy]} />);
    expect(screen.getByText("Bem")).toBeInTheDocument();
  });

  it("exibe badge 'Atenção' para membro em atenção", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.attention]} />);
    expect(screen.getByText("Atenção")).toBeInTheDocument();
  });

  it("exibe badge 'Crítico' para membro crítico", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.critical]} />);
    expect(screen.getByText("Crítico")).toBeInTheDocument();
  });

  it("ordena por criticidade: Crítico → Atenção → Bem por padrão", () => {
    renderMinimal(
      <TeamHealthTable members={[MEMBERS.healthy, MEMBERS.attention, MEMBERS.critical]} />,
    );
    const rows = screen.getAllByRole("row");
    // row[0] = header, row[1] = first data row
    const firstDataRow = rows[1];
    expect(within(firstDataRow!).getByText("Carlos Crítico")).toBeInTheDocument();
    const lastDataRow = rows[rows.length - 1];
    expect(within(lastDataRow!).getByText("Ana Silva")).toBeInTheDocument();
  });

  it("exibe badge com contagem de críticos no header da tabela", () => {
    renderMinimal(
      <TeamHealthTable members={[MEMBERS.critical, MEMBERS.healthy]} />,
    );
    expect(screen.getByText(/1 crítico/i)).toBeInTheDocument();
  });

  it("exibe badge com contagem de atenção quando não há críticos", () => {
    renderMinimal(
      <TeamHealthTable members={[MEMBERS.attention, MEMBERS.healthy]} />,
    );
    expect(screen.getByText(/1 em atenção/i)).toBeInTheDocument();
  });

  it("exibe badge verde quando todos estão bem", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy]} />);
    expect(screen.getByText(/1 bem/i)).toBeInTheDocument();
  });

  it("chama onMemberClick com o membro correto ao clicar na linha", async () => {
    const user = userEvent.setup();
    const onMemberClick = vi.fn();
    renderMinimal(
      <TeamHealthTable members={[MEMBERS.healthy]} onMemberClick={onMemberClick} />,
    );
    const rows = screen.getAllByRole("row");
    await user.click(rows[1]!); // primeira linha de dados
    expect(onMemberClick).toHaveBeenCalledTimes(1);
    expect(onMemberClick).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u-h" }),
    );
  });

  it("não chama onMemberClick quando prop não é fornecida", async () => {
    const user = userEvent.setup();
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy]} />);
    const rows = screen.getAllByRole("row");
    await user.click(rows[1]!);
    // sem erros, sem crash
  });

  it("coluna de status tem aria-sort pois é a ordenação padrão", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy, MEMBERS.critical]} />);
    // O DS TableHeaderCell com sortDirection="asc" renderiza o th com aria-sort="ascending"
    const statusTh = screen.getByRole("columnheader", { name: /status/i });
    expect(statusTh).toHaveAttribute("aria-sort");
  });

  it("coluna de performance é sortável (botão presente)", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy]} />);
    // Colunas sem sort ativo têm aria-sort="none" e botão acessível
    expect(
      screen.getByRole("button", { name: "Ordenar por Performance" }),
    ).toBeInTheDocument();
  });

  // ── Busca por colaborador ──────────────────────────────────────────────────

  it("exibe campo de busca no cabeçalho da tabela", () => {
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy]} />);
    expect(screen.getByPlaceholderText("Buscar colaborador...")).toBeInTheDocument();
  });

  it("filtra membros pelo nome via busca", async () => {
    const user = userEvent.setup();
    renderMinimal(
      <TeamHealthTable members={[MEMBERS.healthy, MEMBERS.critical]} />,
    );
    const input = screen.getByPlaceholderText("Buscar colaborador...");
    await user.type(input, "Carlos");
    expect(screen.getByText("Carlos Crítico")).toBeInTheDocument();
    expect(screen.queryByText("Ana Silva")).not.toBeInTheDocument();
  });

  it("filtra membros pelo cargo via busca", async () => {
    const user = userEvent.setup();
    const memberWithTitle = makeMember({
      userId: "u-t",
      name: "Bruno Engenheiro",
      jobTitle: "Engenheiro Sênior",
    });
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy, memberWithTitle]} />);
    const input = screen.getByPlaceholderText("Buscar colaborador...");
    await user.type(input, "Engenheiro");
    expect(screen.getByText("Bruno Engenheiro")).toBeInTheDocument();
    expect(screen.queryByText("Ana Silva")).not.toBeInTheDocument();
  });

  it("exibe mensagem de nenhum resultado quando busca não encontra membros", async () => {
    const user = userEvent.setup();
    renderMinimal(<TeamHealthTable members={[MEMBERS.healthy]} />);
    const input = screen.getByPlaceholderText("Buscar colaborador...");
    await user.type(input, "XYZ inexistente");
    expect(screen.getByText(/nenhum colaborador encontrado/i)).toBeInTheDocument();
  });

  it("mantém badge de saúde do cabeçalho baseado no total de membros (não na busca)", async () => {
    const user = userEvent.setup();
    renderMinimal(
      <TeamHealthTable members={[MEMBERS.critical, MEMBERS.healthy]} />,
    );
    const input = screen.getByPlaceholderText("Buscar colaborador...");
    await user.type(input, "Ana");
    // badge ainda mostra "1 crítico" mesmo com Ana sendo exibida
    expect(screen.getByText(/1 crítico/i)).toBeInTheDocument();
  });

  it("inverte a ordem ao clicar duas vezes no mesmo cabeçalho", async () => {
    const user = userEvent.setup();
    const membros = [
      makeMember({ userId: "u1", name: "Zebra", performanceScore: 90, healthStatus: "healthy" }),
      makeMember({ userId: "u2", name: "Alfa", performanceScore: 50, healthStatus: "healthy" }),
    ];
    renderMinimal(<TeamHealthTable members={membros} />);

    const performanceHeader = screen.getByRole("button", { name: "Ordenar por Performance" });

    // Primeiro clique — ordena por performance desc (maior primeiro)
    await user.click(performanceHeader);
    let rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("Zebra")).toBeInTheDocument();

    // Segundo clique — inverte para asc (menor primeiro)
    await user.click(performanceHeader);
    rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("Alfa")).toBeInTheDocument();
  });
});
