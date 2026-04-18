/**
 * Tests for CalibrationModal
 *
 * Modal for calibrating a participant's scores across dimensions.
 * Shows 9-box preview, score tables by dimension, justification textarea,
 * and support data (OKRs, feedbacks, pulse).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { CalibrationModal } from "./CalibrationModal";
import type { CalibrationParticipant, CalibrationQuestionScore } from "../types";

const mockParticipant: CalibrationParticipant = {
  id: "p1",
  name: "Ana Ferreira",
  initials: "AF",
  department: "Engenharia",
  selfScore: 4.2,
  managerScore: 3.8,
  score360: 4.0,
  finalScore: null,
  potential: "alto",
  status: "pendente",
  respondedAt: "2026-03-15",
  biasAlert: undefined,
  okrCompletion: 85,
  feedbackCount: 12,
  pulseMean: 4.1,
};

const mockQuestions: CalibrationQuestionScore[] = [
  {
    questionId: "q1",
    questionText: "Qualidade de entrega",
    questionType: "likert",
    dimension: "performance",
    selfScore: 4.0,
    managerScore: 3.5,
    score360: 3.8,
    calibratedScore: null,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    questionId: "q2",
    questionText: "Comunicacao efetiva",
    questionType: "likert",
    dimension: "performance",
    selfScore: 3.8,
    managerScore: 4.0,
    score360: 3.9,
    calibratedScore: null,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    questionId: "q3",
    questionText: "Capacidade de aprendizado",
    questionType: "likert",
    dimension: "potential",
    selfScore: 4.5,
    managerScore: 4.2,
    score360: 4.3,
    calibratedScore: null,
    scaleMin: 1,
    scaleMax: 5,
  },
];

const mockOnClose = vi.fn();
const mockOnSave = vi.fn();

function renderModal(overrides: Partial<{ participant: CalibrationParticipant; questions: CalibrationQuestionScore[]; open: boolean }> = {}) {
  const user = userEvent.setup();
  const result = renderWithProviders(
    <CalibrationModal
      participant={overrides.participant ?? mockParticipant}
      questions={overrides.questions ?? mockQuestions}
      open={overrides.open ?? true}
      onClose={mockOnClose}
      onSave={mockOnSave}
    />,
  );
  return { user, ...result };
}

describe("CalibrationModal", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOnClose.mockClear();
    mockOnSave.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════════════════════

  it("renders the participant name in the title", () => {
    renderModal();
    expect(screen.getByText(/Calibragem — Ana Ferreira/)).toBeInTheDocument();
  });

  it("renders the status badge as Pendente", () => {
    renderModal();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("renders the 9-Box classification", () => {
    renderModal();
    expect(screen.getByText("Posição no 9-Box")).toBeInTheDocument();
  });

  it("renders Desempenho dimension label", () => {
    renderModal();
    const desempenhoElements = screen.getAllByText("Desempenho");
    expect(desempenhoElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Potencial dimension section", () => {
    renderModal();
    expect(screen.getByText("Potencial e crescimento")).toBeInTheDocument();
  });

  it("renders the justification textarea", () => {
    renderModal();
    expect(screen.getByText("Justificativa")).toBeInTheDocument();
  });

  it("renders the save button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /salvar calibragem/i })).toBeInTheDocument();
  });

  it("renders the cancel button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  it("renders support data when OKR completion is present", () => {
    renderModal();
    expect(screen.getByText("OKRs concluídos")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders support data when feedback count is present", () => {
    renderModal();
    expect(screen.getByText("Feedbacks recebidos")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Interactions
  // ═══════════════════════════════════════════════════════════════

  it("calls onClose when cancel button is clicked", async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge cases
  // ═══════════════════════════════════════════════════════════════

  it("renders no-questions alert when questions list is empty", () => {
    renderModal({ questions: [] });
    expect(screen.getByText("Sem perguntas numéricas")).toBeInTheDocument();
  });

  it("renders bias alert when participant has a biasAlert", () => {
    renderModal({
      participant: {
        ...mockParticipant,
        biasAlert: "Tendencia de leniencia detectada",
      },
    });
    expect(screen.getByText("Alerta de viés detectado pela IA")).toBeInTheDocument();
  });

  it("shows Calibrado badge for calibrated participant", () => {
    renderModal({
      participant: { ...mockParticipant, status: "calibrado" },
    });
    expect(screen.getByText("Calibrado")).toBeInTheDocument();
  });
});
