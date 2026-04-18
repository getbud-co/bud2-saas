/**
 * Tests for QuestionResultCard
 *
 * Card component that renders a question result with chart,
 * type/response badges, and detail modal.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../../tests/setup/test-utils";
import { QuestionResultCard } from "./QuestionResultCard";
import type { QuestionResult } from "../types";

function buildLikertResult(overrides?: Partial<QuestionResult>): QuestionResult {
  return {
    questionId: "q1",
    questionText: "Satisfacao com ambiente de trabalho",
    questionType: "likert",
    responseCount: 42,
    data: {
      distribution: [
        { label: "1", count: 2, percent: 5 },
        { label: "2", count: 5, percent: 12 },
        { label: "3", count: 10, percent: 24 },
        { label: "4", count: 15, percent: 36 },
        { label: "5", count: 10, percent: 24 },
      ],
      average: 3.6,
    },
    individualResponses: [
      { id: "r1", name: "Ana Ferreira", initials: "AF", department: "Engenharia", answeredAt: "2026-03-10", numericValue: 4 },
      { id: "r2", name: "Joao Martins", initials: "JM", department: "Produto", answeredAt: "2026-03-11", numericValue: 3 },
    ],
    ...overrides,
  };
}

function buildTextResult(): QuestionResult {
  return {
    questionId: "q2",
    questionText: "O que podemos melhorar?",
    questionType: "text_long",
    responseCount: 15,
    data: {
      responses: [
        "Melhorar comunicacao entre times",
        "Mais autonomia nos projetos",
        "Flexibilidade de horario",
        "Beneficios de saude mental",
        "Treinamentos tecnicos",
        "Sala de descanso",
      ],
      totalCount: 15,
    },
    individualResponses: [
      { id: "r1", name: "Ana", initials: "A", department: "Eng", answeredAt: "2026-03-10", textValue: "Melhorar comunicacao entre times" },
    ],
  };
}

function buildYesNoResult(): QuestionResult {
  return {
    questionId: "q3",
    questionText: "Voce recomendaria a empresa?",
    questionType: "yes_no",
    responseCount: 50,
    data: {
      yes: 40,
      no: 10,
      yesPercent: 80,
      noPercent: 20,
    },
    individualResponses: [],
  };
}

function renderCard(result?: QuestionResult, index = 0) {
  const user = userEvent.setup();
  const r = renderWithProviders(
    <QuestionResultCard result={result ?? buildLikertResult()} index={index} />,
  );
  return { user, ...r };
}

describe("QuestionResultCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // Likert type
  // ═══════════════════════════════════════════════════════════════

  it("renders the question text with index", () => {
    renderCard(buildLikertResult(), 0);
    expect(screen.getByText(/1\. Satisfacao com ambiente de trabalho/)).toBeInTheDocument();
  });

  it("renders the type badge for likert", () => {
    renderCard(buildLikertResult());
    expect(screen.getByText("Escala linear")).toBeInTheDocument();
  });

  it("renders the response count badge", () => {
    renderCard(buildLikertResult());
    expect(screen.getByText("42 respostas")).toBeInTheDocument();
  });

  it("renders the average score", () => {
    renderCard(buildLikertResult());
    expect(screen.getByText(/3\.6/)).toBeInTheDocument();
  });

  it("renders the Detalhes button", () => {
    renderCard(buildLikertResult());
    expect(screen.getByRole("button", { name: /detalhes/i })).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Text type
  // ═══════════════════════════════════════════════════════════════

  it("renders text responses", () => {
    renderCard(buildTextResult());
    expect(screen.getByText("Melhorar comunicacao entre times")).toBeInTheDocument();
  });

  it("renders 'Ver todas' button for text with more than 5 responses", () => {
    renderCard(buildTextResult());
    expect(screen.getByRole("button", { name: /ver todas/i })).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Yes/No type
  // ═══════════════════════════════════════════════════════════════

  it("renders Sim/Nao labels", () => {
    renderCard(buildYesNoResult());
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.getByText("Não")).toBeInTheDocument();
  });

  it("renders yes/no counts", () => {
    renderCard(buildYesNoResult());
    expect(screen.getByText(/40 respostas/)).toBeInTheDocument();
    expect(screen.getByText(/10 respostas/)).toBeInTheDocument();
  });
});
