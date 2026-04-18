/**
 * Tests for CalibrationTab
 *
 * Tab that shows calibration data: KPIs, 9-Box grid, participant table,
 * and calibration modal. Receives SurveyResultData as prop.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { CalibrationTab } from "./CalibrationTab";
import type { SurveyResultData } from "../types";

function buildMinimalData(overrides?: Partial<SurveyResultData>): SurveyResultData {
  return {
    surveyId: "s1",
    surveyName: "Ciclo Q1 2026",
    surveyType: "360_feedback",
    surveyCategory: "ciclo",
    status: "active",
    period: "01/01/2026 – 31/03/2026",
    isAnonymous: false,
    kpis: {
      views: 100,
      started: 80,
      responses: 60,
      completionRate: 75,
      avgCompletionTime: "12 min",
    },
    sections: [],
    calibration: {
      sessionStatus: "em_andamento",
      totalParticipants: 3,
      calibratedCount: 1,
      participants: [
        {
          id: "p1",
          name: "Ana Ferreira",
          initials: "AF",
          department: "Engenharia",
          selfScore: 4.2,
          managerScore: 3.8,
          score360: 4.0,
          finalScore: 4.0,
          potential: "alto",
          status: "calibrado",
          respondedAt: "2026-03-01",
          calibrationScores: [
            { questionId: "q1", questionText: "Qualidade", questionType: "likert", dimension: "performance", selfScore: 4.2, managerScore: 3.8, score360: 4.0, calibratedScore: 4.0, scaleMin: 1, scaleMax: 5 },
          ],
        },
        {
          id: "p2",
          name: "Joao Martins",
          initials: "JM",
          department: "Produto",
          selfScore: 3.5,
          managerScore: 3.2,
          finalScore: null,
          potential: "médio",
          status: "pendente",
          respondedAt: "2026-03-05",
          calibrationScores: [
            { questionId: "q1", questionText: "Qualidade", questionType: "likert", dimension: "performance", selfScore: 3.5, managerScore: 3.2, calibratedScore: null, scaleMin: 1, scaleMax: 5 },
          ],
        },
        {
          id: "p3",
          name: "Carla Santos",
          initials: "CS",
          department: "People",
          selfScore: 4.8,
          managerScore: 4.5,
          finalScore: null,
          potential: "alto",
          status: "pendente",
          respondedAt: "2026-03-10",
          calibrationScores: [
            { questionId: "q1", questionText: "Qualidade", questionType: "likert", dimension: "performance", selfScore: 4.8, managerScore: 4.5, calibratedScore: null, scaleMin: 1, scaleMax: 5 },
          ],
        },
      ],
    },
    ...overrides,
  };
}

function renderTab(data?: SurveyResultData) {
  return renderWithProviders(<CalibrationTab data={data ?? buildMinimalData()} />);
}

describe("CalibrationTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // No data state
  // ═══════════════════════════════════════════════════════════════

  it("shows info alert when no calibration data", () => {
    renderTab(buildMinimalData({ calibration: undefined }));
    expect(screen.getByText(/Dados de calibragem não disponíveis/)).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Rendering with data
  // ═══════════════════════════════════════════════════════════════

  it("renders session status badge", () => {
    renderTab();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });

  it("renders calibrated count in session bar", () => {
    renderTab();
    expect(screen.getByText("1/3 calibrados")).toBeInTheDocument();
  });

  it("renders the export button", () => {
    renderTab();
    expect(screen.getByRole("button", { name: /exportar/i })).toBeInTheDocument();
  });

  it("renders KPI for Participantes", () => {
    renderTab();
    expect(screen.getByText("Participantes")).toBeInTheDocument();
  });

  it("renders KPI for Calibrados", () => {
    renderTab();
    expect(screen.getByText("Calibrados")).toBeInTheDocument();
  });

  it("renders KPI for Pendentes", () => {
    renderTab();
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
  });

  it("renders the 9-Box grid title", () => {
    renderTab();
    expect(screen.getByText("Mapa de talentos (9-Box)")).toBeInTheDocument();
  });

  it("renders the calibration table title", () => {
    renderTab();
    expect(screen.getByText("Calibração")).toBeInTheDocument();
  });

  it("renders participant names in the table", () => {
    renderTab();
    expect(screen.getByText("Ana Ferreira")).toBeInTheDocument();
    expect(screen.getByText("Joao Martins")).toBeInTheDocument();
    expect(screen.getByText("Carla Santos")).toBeInTheDocument();
  });

  it("renders Calibrar button for pending participants", () => {
    renderTab();
    const calibrarButtons = screen.getAllByRole("button", { name: /calibrar/i });
    expect(calibrarButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Ver button for calibrated participants", () => {
    renderTab();
    const verButtons = screen.getAllByRole("button", { name: /^ver$/i });
    expect(verButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders search input", () => {
    renderTab();
    expect(screen.getByPlaceholderText("Buscar colaborador...")).toBeInTheDocument();
  });
});
