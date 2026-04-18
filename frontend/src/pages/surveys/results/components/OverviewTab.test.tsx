/**
 * Tests for OverviewTab
 *
 * Tab showing HR review overview: heatmap, attention points, trends,
 * and action plan. Receives SurveyResultData as prop.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { OverviewTab } from "./OverviewTab";
import type { SurveyResultData } from "../types";

function buildData(overrides?: Partial<SurveyResultData>): SurveyResultData {
  return {
    surveyId: "s1",
    surveyName: "Pulse Check",
    surveyType: "pulse",
    surveyCategory: "pesquisa",
    status: "closed",
    period: "01/01/2026 – 31/01/2026",
    isAnonymous: true,
    kpis: {
      views: 200,
      started: 150,
      responses: 120,
      completionRate: 80,
      avgCompletionTime: "8 min",
    },
    sections: [],
    hrReview: {
      heatmap: {
        entries: [
          { question: "Q1", department: "Engenharia", score: 4.2 },
          { question: "Q1", department: "Produto", score: 3.8 },
          { question: "Q2", department: "Engenharia", score: 3.5 },
          { question: "Q2", department: "Produto", score: 4.0 },
        ],
        questions: ["Q1", "Q2"],
        questionLabels: { Q1: "Satisfacao geral", Q2: "Ambiente de trabalho" },
        departments: ["Engenharia", "Produto"],
      },
      attentionPoints: [
        {
          id: "ap1",
          questionText: "Satisfacao com lideranca",
          score: 2.8,
          benchmark: 3.5,
          department: "Produto",
          severity: "critical",
          insight: "Score significativamente abaixo do benchmark",
        },
      ],
      trends: [
        {
          questionText: "Engajamento",
          current: 4.0,
          previous: 3.5,
          delta: 0.5,
          history: [3.0, 3.2, 3.5, 4.0],
        },
      ],
      actionItems: [
        {
          id: "ai1",
          title: "Workshop de lideranca",
          description: "Realizar workshop para gestores de Produto",
          priority: "alta",
          department: "Produto",
          status: "pendente",
          assignee: "Maria Silva",
        },
      ],
    },
    ...overrides,
  };
}

function renderTab(data?: SurveyResultData) {
  return renderWithProviders(<OverviewTab data={data ?? buildData()} />);
}

describe("OverviewTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // No data state
  // ═══════════════════════════════════════════════════════════════

  it("shows fallback text when no HR review data", () => {
    renderTab(buildData({ hrReview: undefined }));
    expect(screen.getByText(/Dados de visão geral não disponíveis/)).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Rendering with data
  // ═══════════════════════════════════════════════════════════════

  it("renders heatmap section title", () => {
    renderTab();
    expect(screen.getByText("Score por departamento")).toBeInTheDocument();
  });

  it("renders heatmap description", () => {
    renderTab();
    expect(screen.getByText(/Média das respostas numéricas/)).toBeInTheDocument();
  });

  it("renders attention points section", () => {
    renderTab();
    expect(screen.getByText("Pontos de atenção")).toBeInTheDocument();
  });

  it("renders attention point count badge", () => {
    renderTab();
    // Badge showing "1" for the single attention point
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders attention point question text", () => {
    renderTab();
    expect(screen.getByText("Satisfacao com lideranca")).toBeInTheDocument();
  });

  it("renders trends section", () => {
    renderTab();
    expect(screen.getByText("Tendências")).toBeInTheDocument();
  });

  it("renders trend question text", () => {
    renderTab();
    expect(screen.getByText("Engajamento")).toBeInTheDocument();
  });

  it("renders action plan section", () => {
    renderTab();
    expect(screen.getByText("Plano de ação")).toBeInTheDocument();
  });

  it("renders action item title", () => {
    renderTab();
    expect(screen.getByText("Workshop de lideranca")).toBeInTheDocument();
  });

  it("renders Nova acao button", () => {
    renderTab();
    expect(screen.getByRole("button", { name: /nova ação/i })).toBeInTheDocument();
  });
});
