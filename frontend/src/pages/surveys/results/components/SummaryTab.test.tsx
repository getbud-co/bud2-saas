/**
 * Tests for SummaryTab
 *
 * Tab showing KPIs and question results organized by section.
 * Uses PeopleDataContext for team options and ConfigDataContext for cycles.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { SummaryTab } from "./SummaryTab";
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
    sections: [
      {
        title: "Engajamento",
        questions: [
          {
            questionId: "q1",
            questionText: "Como voce avalia seu engajamento?",
            questionType: "likert",
            responseCount: 120,
            data: {
              distribution: [
                { label: "1", count: 5, percent: 4 },
                { label: "2", count: 10, percent: 8 },
                { label: "3", count: 25, percent: 21 },
                { label: "4", count: 50, percent: 42 },
                { label: "5", count: 30, percent: 25 },
              ],
              average: 3.8,
            },
            individualResponses: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function renderTab(data?: SurveyResultData) {
  return renderWithProviders(<SummaryTab data={data ?? buildData()} />);
}

describe("SummaryTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // KPIs
  // ═══════════════════════════════════════════════════════════════

  it("renders Visualizacoes KPI", () => {
    renderTab();
    expect(screen.getByText("Visualizações")).toBeInTheDocument();
  });

  it("renders Pesquisas iniciadas KPI", () => {
    renderTab();
    expect(screen.getByText("Pesquisas iniciadas")).toBeInTheDocument();
  });

  it("renders Respostas recebidas KPI", () => {
    renderTab();
    expect(screen.getByText("Respostas recebidas")).toBeInTheDocument();
  });

  it("renders Taxa de conclusao KPI", () => {
    renderTab();
    expect(screen.getByText("Taxa de conclusão")).toBeInTheDocument();
  });

  it("renders Tempo medio KPI", () => {
    renderTab();
    expect(screen.getByText("Tempo médio")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Results section
  // ═══════════════════════════════════════════════════════════════

  it("renders Resultados por pergunta heading", () => {
    renderTab();
    expect(screen.getByText("Resultados por pergunta")).toBeInTheDocument();
  });

  it("renders the question text", () => {
    renderTab();
    expect(screen.getByText(/Como voce avalia seu engajamento/)).toBeInTheDocument();
  });

  it("renders the response count for the question", () => {
    renderTab();
    expect(screen.getByText("120 respostas")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Multiple sections
  // ═══════════════════════════════════════════════════════════════

  it("renders accordion when multiple sections exist", () => {
    const data = buildData({
      sections: [
        {
          title: "Secao 1",
          questions: [
            {
              questionId: "q1",
              questionText: "Pergunta 1",
              questionType: "likert",
              responseCount: 10,
              data: { distribution: [], average: 3.5 },
              individualResponses: [],
            },
          ],
        },
        {
          title: "Secao 2",
          questions: [
            {
              questionId: "q2",
              questionText: "Pergunta 2",
              questionType: "yes_no",
              responseCount: 10,
              data: { yes: 8, no: 2, yesPercent: 80, noPercent: 20 },
              individualResponses: [],
            },
          ],
        },
      ],
    });
    renderTab(data);
    expect(screen.getByText("Secao 1")).toBeInTheDocument();
    expect(screen.getByText("Secao 2")).toBeInTheDocument();
  });
});
